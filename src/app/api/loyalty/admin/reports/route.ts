import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { getServiceClient, getLoyaltySettings } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const supabase = getServiceClient();
    const settings = await getLoyaltySettings();

    // 1. Fetch loyalty ledger transactions for report
    const { data: ledger } = await supabase
      .from('loyalty_points_ledger')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    // 2. Fetch loyalty accounts for customer CLV summary
    const { data: accounts } = await supabase
      .from('loyalty_accounts')
      .select(`
        *,
        user:users!loyalty_accounts_user_id_fkey(full_name, phone, created_at)
      `)
      .order('lifetime_spend', { ascending: false })
      .limit(200);

    // 3. Summarize by transaction type
    const breakdownByType: Record<string, { count: number; totalPoints: number }> = {};
    ledger?.forEach((entry: any) => {
      const type = entry.transaction_type || 'other';
      if (!breakdownByType[type]) {
        breakdownByType[type] = { count: 0, totalPoints: 0 };
      }
      breakdownByType[type].count += 1;
      breakdownByType[type].totalPoints += entry.points || 0;
    });

    // 4. Calculate Customer Lifetime Value (CLV) estimates
    const clvData = accounts?.map((a: any) => ({
      customerName: a.user?.full_name || 'Customer',
      phone: a.user?.phone || '',
      tier: a.tier_id,
      totalOrders: a.total_orders_completed || 0,
      lifetimeSpend: a.lifetime_spend || 0,
      pointsBalance: a.points_balance || 0,
      pointsLiabilityRupees: Math.round((a.points_balance || 0) * settings.point_rupee_value * 100) / 100,
      avgOrderValue: (a.total_orders_completed || 0) > 0 ? Math.round(a.lifetime_spend / a.total_orders_completed) : 0,
    })) || [];

    return NextResponse.json({
      success: true,
      breakdownByType,
      clvData,
      totalLiabilityRupees: Math.round(
        (accounts?.reduce((sum: number, a: any) => sum + (a.points_balance || 0), 0) || 0) * settings.point_rupee_value
      ),
    });
  } catch (err: any) {
    console.error('[API Admin Loyalty Reports] Error:', err);
    return NextResponse.json({ error: err.message || 'Report generation failed' }, { status: 500 });
  }
}
