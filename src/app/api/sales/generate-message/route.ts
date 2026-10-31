import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdminSession } from '@/lib/auth-server';

interface GenerateRequest {
  leadId?: string;
  customerId?: string;
  recipientType: 'b2b' | 'b2c';
  recipientName: string;
  recipientPhone?: string;
  businessName?: string;
  category?: string;
  area?: string;
  purpose: string;
  language: 'hinglish' | 'english';
  customNotes?: string;
  optOut?: boolean;
}

export async function POST(request: Request) {
  try {
    // 1. Server-side Supabase Admin Authentication Verification (CRITICAL)
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Authentication required' },
        { status: auth.status || 401 }
      );
    }

    const body: GenerateRequest = await request.json();
    const {
      leadId,
      customerId,
      recipientType = 'b2b',
      recipientName,
      recipientPhone = '',
      businessName = '',
      category = 'Restaurant',
      area = 'Navi Mumbai',
      purpose = 'Introduction',
      language = 'hinglish',
      customNotes = '',
      optOut = false,
    } = body;

    // 2. Strict Customer & Lead Opt-Out Enforcement (MEDIUM)
    if (optOut) {
      return NextResponse.json(
        { error: 'Recipient has opted out of communications. Outbound message generation is blocked.' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verify opt-out status in database if leadId is provided
    if (leadId) {
      const { data: leadRecord } = await supabase
        .from('sales_leads')
        .select('opt_out, status')
        .eq('id', leadId)
        .single();

      if (leadRecord && (leadRecord.opt_out === true || leadRecord.status === 'Opted Out')) {
        return NextResponse.json(
          { error: 'Recipient has opted out of communications. Outbound message generation is blocked.' },
          { status: 400 }
        );
      }
    }

    if (!recipientName) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      );
    }

    // 3. Grounding: Fetch current approved prices strictly from Supabase product catalogue
    const { data: productsData } = await supabase
      .from('products')
      .select('name, price_b2c, price_b2b, unit, category, is_available')
      .eq('is_available', true)
      .limit(8);

    const hasCatalog = Boolean(productsData && productsData.length > 0);
    const availableProducts = hasCatalog ? productsData! : [];

    let catalogSummary = '';
    let catalogWarning = '';

    if (hasCatalog) {
      catalogSummary = availableProducts
        .map((p: any) => `- ${p.name}: Retail ₹${p.price_b2c}/${p.unit}, Wholesale ₹${p.price_b2b}/${p.unit}`)
        .join('\n');
    } else {
      catalogWarning = 'Live product catalogue could not be verified from database. Outdated prices omitted.';
      catalogSummary = '- Custom wholesale rates and cut specifications confirmed via official quotation.';
    }

    // 4. Coupon Safety: Only mention coupons that exist, are active, and unexpired in database
    let activePromoCoupon: any = null;
    try {
      const { data: couponsData } = await supabase
        .from('coupons')
        .select('code, discount_percent, flat_discount, min_order_amount, expiry_date, is_active')
        .eq('is_active', true);

      if (couponsData && couponsData.length > 0) {
        const now = Date.now();
        const validCoupons = couponsData.filter((c: any) => {
          if (!c.expiry_date) return true;
          return new Date(c.expiry_date).getTime() >= now;
        });

        if (validCoupons.length > 0) {
          activePromoCoupon = validCoupons[0];
        }
      }
    } catch (e) {
      // If coupons table isn't accessible, do NOT assume any coupon
      activePromoCoupon = null;
    }

    // 5. Server-side Gemini API Key Resolution (Exclusively from server environment variables)
    // Never query sales_settings or accept key from request body
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

    let generatedText = '';
    let generatorUsed = 'template';

    // 6. Invoke Gemini if server environment key is configured
    if (geminiApiKey) {
      try {
        const prompt = buildGeminiPrompt({
          recipientType,
          recipientName,
          businessName,
          category,
          area,
          purpose,
          language,
          customNotes,
          catalogSummary,
          hasCatalog,
          activePromoCoupon,
        });

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const textCandidate = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textCandidate) {
            generatedText = textCandidate.trim();
            generatorUsed = 'gemini';
          }
        }
      } catch (aiErr) {
        console.error('[Sales API] Gemini generation error, using rule-based fallback:', aiErr);
      }
    }

    // 7. Safe Rule-Based Generation Fallback (Grounded strictly in verified data)
    if (!generatedText) {
      generatedText = generateSafeRuleBasedTemplate({
        recipientType,
        recipientName,
        businessName,
        category,
        area,
        purpose,
        language,
        customNotes,
        availableProducts,
        hasCatalog,
        activePromoCoupon,
      });
      generatorUsed = 'template';
    }

    return NextResponse.json({
      success: true,
      message: generatedText,
      meta: {
        recipientType,
        recipientName,
        recipientPhone,
        purpose,
        language,
        generatorUsed,
        catalogVerified: hasCatalog,
        catalogWarning: catalogWarning || undefined,
        couponVerified: Boolean(activePromoCoupon),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Sales API] Server error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate message' },
      { status: 500 }
    );
  }
}

function buildGeminiPrompt(params: any): string {
  const {
    recipientType,
    recipientName,
    businessName,
    category,
    area,
    purpose,
    language,
    customNotes,
    catalogSummary,
    hasCatalog,
    activePromoCoupon,
  } = params;

  return `
You are the senior commercial sales executive for MeatCity, a premium FSSAI-certified fresh chicken, mutton, and eggs supplier located at Sector 20, Turbhe, Navi Mumbai.

TARGET RECIPIENT:
- Recipient Type: ${recipientType.toUpperCase()}
- Name: ${recipientName}
- Business Name: ${businessName || 'Food Business'}
- Category: ${category || 'Restaurant'}
- Location: ${area}, Navi Mumbai
- Purpose: ${purpose}
- Language: ${language === 'hinglish' ? 'Respectful Roman Hinglish (natural Indian business conversational style).' : 'Professional English.'}
${customNotes ? `- Custom Context: ${customNotes}` : ''}

MEATCITY COMMERCIAL SPECIFICATIONS:
- Processing Hub: Shop No.2, Sector 20, Turbhe, Navi Mumbai (FSSAI Reg No: 21525016001365).
- Early morning express dispatch (6:00 AM - 8:00 AM) across Vashi, Nerul, Belapur, Turbhe, Kopar Khairane, Kharghar, Panvel.
- Fresh halal cuts dressed daily.
${hasCatalog ? `CURRENT APPROVED CATALOGUE RATES:\n${catalogSummary}` : `PRICING POLICY: Rates are quoted upon requirement verification. Do NOT fabricate numerical prices.`}
${activePromoCoupon ? `APPROVED PROMOTION: Coupon ${activePromoCoupon.code} (${activePromoCoupon.discount_percent ? `${activePromoCoupon.discount_percent}% off` : `₹${activePromoCoupon.flat_discount} off`} on min order ₹${activePromoCoupon.min_order_amount}).` : `PROMOTION POLICY: No active coupons exist. Do NOT invent coupon codes like WELCOME20.`}

STRICT SAFETY RULES:
1. Do NOT include markdown code blocks, subject lines, or placeholders like [Your Name].
2. Format as a ready-to-send WhatsApp message with polite greeting and professional emojis.
3. Sign off with:
   MeatCity Turbhe Hub
   📞 Call/WhatsApp: +91 7977630912
   🌐 https://meatcity.in
4. NEVER invent prices, coupons, or unsecured credit terms.
`.trim();
}

function generateSafeRuleBasedTemplate(params: any): string {
  const {
    recipientType,
    recipientName,
    businessName,
    category,
    area,
    purpose,
    language,
    customNotes,
    availableProducts,
    hasCatalog,
    activePromoCoupon,
  } = params;

  const targetBiz = businessName || `${recipientName}'s ${category || 'Kitchen'}`;
  const isHinglish = language === 'hinglish';

  // Format verified catalogue pricing
  let pricingSection = '';
  if (hasCatalog && availableProducts.length > 0) {
    const lines = availableProducts.slice(0, 3).map(
      (p: any) => `• ${p.name}: ₹${p.price_b2b || p.price_b2c}/${p.unit}`
    );
    pricingSection = `\n✅ Approved Wholesale Slabs:\n${lines.join('\n')}\n`;
  }

  // Format verified coupon
  let promoMention = '';
  if (activePromoCoupon) {
    promoMention = isHinglish
      ? `\nSpecial Welcome Offer: Use active coupon code ${activePromoCoupon.code} for instant savings at checkout!`
      : `\nSpecial Welcome Offer: Apply active coupon code ${activePromoCoupon.code} at checkout!`;
  }

  if (recipientType === 'b2b') {
    if (purpose === 'Wholesale Supply Enquiry' || purpose === 'Introduction') {
      if (isHinglish) {
        return `Namaste ${recipientName} ji! 🙏

MeatCity Turbhe Hub se baat kar rahe hain. Hum Navi Mumbai (${area}) ke leading restaurants, caterers aur commercial kitchens ko daily subah fresh halal chicken, mutton aur farm eggs direct wholesale rates pe supply karte hain.

✅ Guaranteed Early Morning Dispatch (6:00 AM - 8:00 AM)
✅ 100% Fresh Daily Halal Cuts (FSSAI Reg No: 21525016001365)${pricingSection}
${customNotes ? `Note: ${customNotes}\n` : ''}Kya hum aapke ${targetBiz} ke liye ek sample trial batch arrange kar sakte hain taaki aap cut quality aur timely delivery check kar sakein?

Warm Regards,
MeatCity Turbhe Supply Team
📞 Call/WhatsApp: +91 7977630912
🌐 https://meatcity.in`;
      } else {
        return `Dear ${recipientName},

Greetings from MeatCity!

We are Navi Mumbai's trusted fresh halal meat supplier operating from Sector 20, Turbhe. We supply commercial kitchens and food businesses across ${area} with premium quality fresh chicken, mutton, and eggs.

Key Commercial Benefits for ${targetBiz}:
• Guaranteed early morning dispatch (6:00 AM - 8:00 AM)
• Consistent clean cuts & FSSAI certified standards${pricingSection}
${customNotes ? `Special Note: ${customNotes}\n` : ''}Would you be open to a sample trial batch this week to test our cut consistency and freshness for your kitchen?

Best Regards,
MeatCity Wholesale Supply Team
📞 Call/WhatsApp: +91 7977630912
🌐 https://meatcity.in`;
      }
    }

    if (purpose === 'Trial Order Proposal') {
      return isHinglish
        ? `Namaste ${recipientName} ji! 🙏\n\nMeatCity Turbhe se update. Hum ${targetBiz} ke liye dedicated trial batch offer kar rahe hain direct wholesale rate pe. Aap quality aur timely 7 AM delivery test kar sakte hain.\n\nKya hum kal subah ke liye trial order arrange karein?\n\nRegards,\nMeatCity Turbhe\n📞 +91 7977630912`
        : `Dear ${recipientName},\n\nFollowing up from MeatCity Turbhe. We would like to propose a trial batch of fresh halal cuts for ${targetBiz} at our direct wholesale rate.\n\nShall we schedule a trial delivery for tomorrow morning?\n\nBest Regards,\nMeatCity Team\n📞 +91 7977630912`;
    }

    if (purpose === 'Quotation Follow-up') {
      return isHinglish
        ? `Namaste ${recipientName} ji!\n\nHumne MeatCity Turbhe se ${targetBiz} ke liye wholesale rate quotation share kiya tha. Kya aapne rates aur supply schedule review kiya? Agar koi specific quantity requirements hain, toh please batayein.\n\nDhanyawaad,\nMeatCity Turbhe\n📞 +91 7977630912`
        : `Dear ${recipientName},\n\nFollowing up on the wholesale rate quotation sent for ${targetBiz}. Have you had a chance to review our pricing and delivery terms? We would be delighted to adjust the specifications to match your kitchen's schedule.\n\nSincerely,\nMeatCity Team\n📞 +91 7977630912`;
    }

    // Default B2B Repeat
    return `Namaste ${recipientName} ji! MeatCity Turbhe se daily supply reminder. Kal subah ke liye aapka requirement dispatch ready karna hai. Please confirm order: +91 7977630912.`;
  }

  // B2C Customer Templates
  if (purpose === 'New Customer Promotion' || purpose === 'Product Enquiry Reply') {
    return isHinglish
      ? `Hello ${recipientName}! 😊\n\nMeatCity Navi Mumbai me aapka swagat hai! Hamare paas daily fresh, hygienic aur 100% Halal chicken, mutton aur eggs available hain express delivery ke sath.${promoMention}\n\n📍 Turbhe Hub Express Delivery across Navi Mumbai.\n📞 Support / WhatsApp: +91 7977630912\n🌐 https://meatcity.in`
      : `Hello ${recipientName}!\n\nWelcome to MeatCity Navi Mumbai! Explore our daily fresh, clean, and 100% Halal chicken, mutton, and eggs delivered straight to your doorstep.${promoMention}\n\nEnjoy fresh cuts with express delivery from our Turbhe Hub!\n📞 Call/WhatsApp: +91 7977630912\n🌐 https://meatcity.in`;
  }

  if (purpose === 'Cart Recovery Draft') {
    return isHinglish
      ? `Hello ${recipientName}! Aapke MeatCity cart me fresh cuts pending hain. Aaj hi order complete karein aur payein fresh & fast home delivery: https://meatcity.in/cart. Support: +91 7977630912.`
      : `Hello ${recipientName}, you left fresh cuts in your MeatCity cart! Complete your order now for fresh express delivery to your doorstep: https://meatcity.in/cart. Support: +91 7977630912.`;
  }

  // B2C Repeat
  return isHinglish
    ? `Namaste ${recipientName} ji! MeatCity se reminder: Weekend feast ke liye fresh mutton aur chicken available hain. Order online: https://meatcity.in ya WhatsApp karein: +91 7977630912.`
    : `Hello ${recipientName}! Planning your weekend meal? Fresh premium mutton and chicken cuts are available at MeatCity. Order online: https://meatcity.in or call +91 7977630912.`;
}
