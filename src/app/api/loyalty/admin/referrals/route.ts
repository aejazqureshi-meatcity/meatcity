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

    const supabase = getServiceClient();

    const { data: referrals, error } = await supabase
      .from('loyalty_referrals')
      .select(`
        *,
        referrer:users!loyalty_referrals_referrer_id_fkey(id, full_name, email, phone),
        referee:users!loyalty_referrals_referee_id_fkey(id, full_name, email, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      referrals: referrals || [],
    });
  } catch (err: any) {
    console.error('[API Admin Referrals] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch referrals' }, { status: 500 });
  }
}

// POST: Review suspicious referral
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { referralId, status, reason } = body;

    if (!referralId || !status) {
      return NextResponse.json({ error: 'Referral ID and status required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('loyalty_referrals')
      .update({
        status,
        suspicion_reason: reason || null,
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', referralId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('loyalty_audit_logs').insert({
      action: 'referral_review',
      performed_by: auth.user.id,
      details: { referralId, status, reason },
      reason: reason || `Admin updated referral status to ${status}`,
    });

    return NextResponse.json({ success: true, referral: data });
  } catch (err: any) {
    console.error('[API Admin Referral Review] Error:', err);
    return NextResponse.json({ error: err.message || 'Review failed' }, { status: 500 });
  }
}
