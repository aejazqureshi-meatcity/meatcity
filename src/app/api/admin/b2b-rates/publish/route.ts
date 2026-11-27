import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { publishB2BRates } from '@/lib/pricing/b2b-pricing-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const paperRate = Number(body.paperRate);

    if (isNaN(paperRate) || paperRate <= 0) {
      return NextResponse.json({ error: 'Invalid paper rate. Please enter a positive numerical rate per kg.' }, { status: 400 });
    }

    const effectiveDate = body.effectiveDate || new Date().toISOString().split('T')[0];
    const adminName = auth.user?.full_name || auth.user?.email || 'Super Admin';
    const adminId = auth.user?.id || 'admin-user';
    const customMultipliers = body.customMultipliers || {};

    const result = await publishB2BRates({
      newPaperRate: paperRate,
      effectiveDate,
      adminName,
      adminId,
      customMultipliers,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Admin B2B Rates Publish] POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to publish B2B rates' }, { status: 500 });
  }
}
