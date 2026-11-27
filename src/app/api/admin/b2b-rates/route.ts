import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import {
  getPricingRulesWithProducts,
  getCurrentPaperRate,
  getServiceClient,
  TARGET_CHICKEN_PRODUCTS,
} from '@/lib/pricing/b2b-pricing-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const supabase = getServiceClient();
    const { rules, products, currentRate, unmatchedTargets } = await getPricingRulesWithProducts();

    // Fetch publication history
    const { data: history } = await supabase
      .from('b2b_rate_history')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(10);

    // Products available to be newly linked
    const linkedProductIds = new Set(rules.map((r) => r.product_id));
    const availableProducts = products.filter((p) => !linkedProductIds.has(p.id));

    // Stats
    const totalLinked = rules.filter((r) => r.is_dynamic_enabled).length;
    const totalManual = rules.filter((r) => !r.is_dynamic_enabled || r.pricing_mode === 'manual').length;
    const totalOverridden = rules.filter((r) => r.manual_override_enabled).length;

    const todayDateStr = new Date().toISOString().split('T')[0];
    const isUpdatedToday = currentRate.effective_date === todayDateStr && currentRate.status === 'published';

    // Format IST updated time
    let lastUpdatedIST = 'N/A';
    if (currentRate.published_at) {
      try {
        lastUpdatedIST = new Date(currentRate.published_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch (e) {
        lastUpdatedIST = currentRate.published_at;
      }
    }

    return NextResponse.json({
      success: true,
      currentRate,
      rules,
      products,
      availableProducts,
      unmatchedTargets,
      history: history || [],
      stats: {
        totalLinked,
        totalManual,
        totalOverridden,
        isUpdatedToday,
        lastUpdatedIST,
        todayDate: todayDateStr,
      },
    });
  } catch (err: any) {
    console.error('[API Admin B2B Rates] GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch B2B rates' }, { status: 500 });
  }
}
