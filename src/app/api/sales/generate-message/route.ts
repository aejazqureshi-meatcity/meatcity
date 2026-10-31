import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface GenerateRequest {
  recipientType: 'b2b' | 'b2c';
  recipientName: string;
  recipientPhone?: string;
  businessName?: string;
  category?: string;
  area?: string;
  purpose: string;
  language: 'hinglish' | 'english';
  customNotes?: string;
  productsMentioned?: string[];
}

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      recipientType = 'b2b',
      recipientName,
      recipientPhone = '',
      businessName = '',
      category = 'Restaurant',
      area = 'Navi Mumbai',
      purpose = 'Introduction',
      language = 'hinglish',
      customNotes = '',
      productsMentioned = [],
    } = body;

    if (!recipientName) {
      return NextResponse.json(
        { error: 'Recipient name is required' },
        { status: 400 }
      );
    }

    // 1. Fetch live products from Supabase to ground AI in actual catalog and prices
    const supabase = createClient();
    const { data: productsData } = await supabase
      .from('products')
      .select('name, price_b2c, price_b2b, unit, category')
      .limit(8);

    const availableProducts = (productsData && productsData.length > 0)
      ? productsData
      : [
          { name: 'Fresh Chicken Curry Cut', price_b2c: 240, price_b2b: 200, unit: 'kg' },
          { name: 'Chicken Breast Boneless', price_b2c: 320, price_b2b: 280, unit: 'kg' },
          { name: 'Fresh Mutton Curry Cut', price_b2c: 850, price_b2b: 780, unit: 'kg' },
          { name: 'Fresh Farm Eggs (Tray of 30)', price_b2c: 210, price_b2b: 185, unit: 'tray' },
        ];

    const catalogSummary = availableProducts
      .map((p: any) => `- ${p.name}: Retail ₹${p.price_b2c}/${p.unit}, Wholesale ₹${p.price_b2b}/${p.unit}`)
      .join('\n');

    // 2. Check for Gemini API key (env or sales_settings)
    let geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!geminiApiKey) {
      try {
        const { data: settingRow } = await supabase
          .from('sales_settings')
          .select('value')
          .eq('key', 'gemini_api_key')
          .single();
        if (settingRow?.value) {
          geminiApiKey = settingRow.value;
        }
      } catch (e) {
        // Fallback to template if setting lookup fails
      }
    }

    let generatedText = '';
    let generatorUsed = 'template';

    // 3. If Gemini API Key exists, call Gemini model
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
        });

        // Use gemini-1.5-flash with fallback
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
          const textCandidate =
            geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textCandidate) {
            generatedText = textCandidate.trim();
            generatorUsed = 'gemini';
          }
        } else {
          console.warn('Gemini API call returned non-200, falling back to rule-based template');
        }
      } catch (aiErr) {
        console.error('Gemini call error:', aiErr);
      }
    }

    // 4. Fallback Rule-Based Generation (Zero failure guarantee)
    if (!generatedText) {
      generatedText = generateRuleBasedTemplate({
        recipientType,
        recipientName,
        businessName,
        category,
        area,
        purpose,
        language,
        customNotes,
        availableProducts,
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
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating sales message:', error);
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
  } = params;

  return `
You are the senior sales executive for MeatCity, a premium FSSAI-certified fresh chicken, mutton, and eggs supplier located at Sector 20, Turbhe, Navi Mumbai.

YOUR MISSION:
Write a high-converting, polite, and persuasive WhatsApp message for the prospect described below.
This message will be reviewed by the MeatCity business owner before manual sending.

TARGET RECIPIENT:
- Recipient Type: ${recipientType.toUpperCase()}
- Name: ${recipientName}
- Business Name: ${businessName || 'Food Business'}
- Category: ${category || 'Restaurant'}
- Location: ${area}, Navi Mumbai
- Purpose of Message: ${purpose}
- Language / Style: ${language === 'hinglish' ? 'Roman Hinglish (Natural, respectful, Indian business conversational style using English script. E.g. "Namaste Sir, MeatCity Turbhe se baat kar rahe hain...").' : 'Professional, crisp English.'}
${customNotes ? `- Custom Notes / Request: ${customNotes}` : ''}

MEATCITY VALUE PROPOSITIONS & REAL CATALOG:
- Fresh Daily Halal Cuts (Chicken, Mutton, Eggs).
- Direct hub at Sector 20, Turbhe – Express delivery across Vashi, Nerul, Belapur, Turbhe, Kharghar, Panvel before morning rush (6:00 AM - 8:00 AM).
- Transparent wholesale slab rates for commercial kitchens and caterers.
- FSSAI License: Reg No. 21525016001365.
- Real Product Pricing:
${catalogSummary}

STRICT GUIDELINES:
1. Do NOT include markdown code blocks, subject lines, or placeholders like [Your Name].
2. Format as a ready-to-send WhatsApp message with tasteful line breaks and professional emojis (🍗, 🥩, 📦, ✅).
3. Always sign off with:
   - MeatCity Turbhe Hub
   - WhatsApp / Call: +91 7977630912
   - Website: https://meatcity.in
4. Never invent fake prices or unrealistic discounts.
5. Emphasize freshness, hygiene, and timely delivery.
`.trim();
}

function generateRuleBasedTemplate(params: any): string {
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
  } = params;

  const targetBiz = businessName || `${recipientName}'s ${category || 'Kitchen'}`;
  const isHinglish = language === 'hinglish';

  if (recipientType === 'b2b') {
    if (purpose === 'Wholesale Enquiry' || purpose === 'Introduction') {
      if (isHinglish) {
        return `Namaste ${recipientName} ji! 🙏

MeatCity Turbhe Hub se baat kar rahe hain. Hum Navi Mumbai (${area} & nearby) ke leading restaurants, cloud kitchens aur caterers ko daily subah fresh halal chicken, mutton aur farm eggs direct wholesale rates pe supply karte hain.

✅ Daily Early Morning Delivery (6:00 AM - 8:00 AM)
✅ 100% Fresh & FSSAI Certified Halal Cuts
✅ Bulk Wholesale Rates:
• Chicken Curry Cut: ₹${availableProducts[0]?.price_b2b || 200}/kg
• Boneless Breast: ₹${availableProducts[1]?.price_b2b || 280}/kg
• Fresh Mutton Cuts: ₹${availableProducts[2]?.price_b2b || 780}/kg

${customNotes ? `Note: ${customNotes}\n` : ''}Kya hum aapke ${targetBiz} ke liye ek small trial batch arrange kar sakte hain taaki aap meat quality aur cutting check kar sakein?

Warm Regards,
MeatCity Turbhe Team
📞 Call/WhatsApp: +91 7977630912
🌐 https://meatcity.in`;
      } else {
        return `Dear ${recipientName},

Greetings from MeatCity!

We are Navi Mumbai's trusted fresh halal meat supplier operating from Sector 20, Turbhe. We supply top restaurants, caterers, and food businesses across ${area} with premium quality fresh chicken, mutton, and eggs.

Key Supply Benefits for ${targetBiz}:
• Guaranteed early morning dispatch (6:00 AM - 8:00 AM)
• Consistent hygienic cuts & FSSAI certified standards
• Direct wholesale prices starting at ₹${availableProducts[0]?.price_b2b || 200}/kg for fresh chicken

${customNotes ? `Special Note: ${customNotes}\n` : ''}Would you be open to a sample trial order this week to test our cut consistency and freshness for your kitchen?

Best Regards,
MeatCity Supply Team
📞 Call/WhatsApp: +91 7977630912
🌐 https://meatcity.in`;
      }
    }

    if (purpose === 'Trial Order Proposal') {
      if (isHinglish) {
        return `Namaste ${recipientName} ji! 🙏

MeatCity Turbhe se quick update. Hum ${targetBiz} ke liye ek dedicated 10 kg trial batch offer kar rahe hain special wholesale rate pe. 

Aap hamari chicken/mutton quality, clean cutting aur timely morning delivery test kar sakte hain with zero commitment.

Kya hum kal subah 7:00 AM pe trial order dispatch karein?

Regards,
MeatCity Turbhe
📞 +91 7977630912`;
      } else {
        return `Dear ${recipientName},

Following up from MeatCity Turbhe. We would like to propose a 10 kg trial batch of fresh halal cuts for ${targetBiz} at our direct wholesale rate.

Test our quality, clean dressing, and on-time 7:00 AM delivery with complete peace of mind.

Shall we schedule a trial delivery for tomorrow morning?

Best Regards,
MeatCity Team
📞 +91 7977630912`;
      }
    }

    if (purpose === 'Quotation Follow-up') {
      if (isHinglish) {
        return `Namaste ${recipientName} ji! 

Humne MeatCity Turbhe se ${targetBiz} ke liye wholesale rate quotation share kiya tha. 

Kya aapne rates aur supply schedule review kiya? Agar koi specific quantity ya custom cut requirements hain, toh please batayein, hum rate optimize kar denge.

Dhanyawaad,
MeatCity Turbhe
📞 +91 7977630912`;
      } else {
        return `Dear ${recipientName},

Following up on the wholesale rate quotation sent for ${targetBiz}.

Have you had a chance to review our pricing and early morning delivery schedule? We would be delighted to adjust the specifications to match your kitchen's daily requirements.

Looking forward to your thoughts.

Sincerely,
MeatCity Team
📞 +91 7977630912`;
      }
    }

    // Default B2B Repeat Order
    return `Namaste ${recipientName} ji! MeatCity Turbhe se daily supply reminder. Kal subah ke liye aapka requirement dispatch ready karna hai. Please aapka order confirm kar dein: +91 7977630912.`;
  }

  // B2C templates
  if (purpose === 'New Customer Promotion' || purpose === 'Product Enquiry Reply') {
    if (isHinglish) {
      return `Hello ${recipientName}! 😊

MeatCity Navi Mumbai me aapka swagat hai! Hamare paas fresh, hygienic aur chemical-free halal chicken, mutton aur farm eggs available hain express delivery ke sath.

Special Welcome Offer: Use coupon code WELCOME20 to get instant discount on your order at https://meatcity.in.

📍 Turbhe Hub Express Delivery across Navi Mumbai.
📞 Support / WhatsApp: +91 7977630912`;
    } else {
      return `Hello ${recipientName}!

Welcome to MeatCity Navi Mumbai! Explore our daily fresh, clean, and 100% Halal chicken, mutton, and eggs delivered straight to your doorstep.

Special Welcome Offer: Apply coupon code WELCOME20 at checkout on https://meatcity.in.

Enjoy fresh cuts with express delivery from our Turbhe Hub!
📞 Call/WhatsApp: +91 7977630912`;
    }
  }

  // B2C Cart Recovery
  if (purpose === 'Cart Recovery Draft') {
    return isHinglish
      ? `Hello ${recipientName}! Aapke MeatCity cart me fresh cuts pending hain. Aaj hi order complete karein aur payein fresh & fast home delivery: https://meatcity.in/cart. Support: +91 7977630912.`
      : `Hello ${recipientName}, you left fresh cuts in your MeatCity cart! Complete your order now for fresh express delivery to your doorstep: https://meatcity.in/cart. Support: +91 7977630912.`;
  }

  // B2C Repeat Order Reminder
  return isHinglish
    ? `Namaste ${recipientName} ji! MeatCity se reminder: Weekend feast ke liye fresh mutton aur chicken available hain. Order now on https://meatcity.in ya reply karein.`
    : `Hello ${recipientName}! Planning your weekend meal? Fresh premium mutton and chicken cuts are available at MeatCity. Order online: https://meatcity.in.`;
}
