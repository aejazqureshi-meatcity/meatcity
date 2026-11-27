import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { restoreHistoryRates } from '@/lib/pricing/b2b-pricing-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const historyId = body.historyId;

    if (!historyId) {
      return NextResponse.json({ error: 'historyId is required for rollback.' }, { status: 400 });
    }

    const adminName = auth.user?.full_name || auth.user?.email || 'Super Admin';
    const adminId = auth.user?.id || 'admin-user';

    const result = await restoreHistoryRates(historyId, adminName, adminId);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Admin B2B Rates Rollback] POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to rollback rate history' }, { status: 500 });
  }
}
