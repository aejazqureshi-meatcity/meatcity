import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const tier = searchParams.get('tier') || '';

    const supabase = getServiceClient();

    // Query loyalty accounts with user details
    let query = supabase
      .from('loyalty_accounts')
      .select(`
        *,
        user:users!loyalty_accounts_user_id_fkey(id, full_name, email, phone, user_type, status)
      `)
      .order('points_balance', { ascending: false });

    if (tier && tier !== 'all') {
      query = query.eq('tier_id', tier);
    }

    const { data: accounts, error } = await query;
    if (error) throw error;

    let filtered = accounts || [];
    if (search) {
      filtered = filtered.filter((a: any) => {
        const name = (a.user?.full_name || '').toLowerCase();
        const email = (a.user?.email || '').toLowerCase();
        const phone = a.user?.phone || '';
        const code = (a.referral_code || '').toLowerCase();
        return name.includes(search) || email.includes(search) || phone.includes(search) || code.includes(search);
      });
    }

    return NextResponse.json({
      success: true,
      customers: filtered.map((a: any) => ({
        id: a.id,
        userId: a.user_id,
        name: a.user?.full_name || 'Customer',
        email: a.user?.email || '',
        phone: a.user?.phone || '',
        userType: a.user?.user_type || 'b2c',
        status: a.user?.status || 'active',
        tierId: a.tier_id || 'silver',
        pointsBalance: a.points_balance || 0,
        lifetimeEarned: a.lifetime_points_earned || 0,
        lifetimeRedeemed: a.lifetime_points_redeemed || 0,
        lifetimeSpend: a.lifetime_spend || 0,
        totalOrders: a.total_orders_completed || 0,
        referralCode: a.referral_code,
        birthday: a.birthday,
        isSuspended: a.is_suspended,
      })),
    });
  } catch (err: any) {
    console.error('[API Admin Loyalty Customers] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST: Manual adjustment of points by Admin with mandatory reason
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { userId, points, reason } = body;

    if (!userId || points === undefined || !reason || !String(reason).trim()) {
      return NextResponse.json({ error: 'User ID, points, and a mandatory reason are required.' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('adjust_loyalty_points_manual', {
      p_user_id: userId,
      p_points: Number(points),
      p_reason: String(reason).trim(),
      p_admin_id: auth.user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API Admin Manual Adjust] Error:', err);
    return NextResponse.json({ error: err.message || 'Adjustment failed' }, { status: 500 });
  }
}
