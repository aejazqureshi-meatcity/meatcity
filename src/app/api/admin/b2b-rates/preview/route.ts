import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { generatePricePreview } from '@/lib/pricing/b2b-pricing-service';

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
      return NextResponse.json({ error: 'Please provide a valid positive paper rate per kg.' }, { status: 400 });
    }

    const customRules = body.customRules || [];
    const previews = await generatePricePreview(paperRate, customRules);

    return NextResponse.json({
      success: true,
      paperRate,
      previews,
    });
  } catch (err: any) {
    console.error('[API Admin B2B Rates Preview] POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate rate preview' }, { status: 500 });
  }
}
