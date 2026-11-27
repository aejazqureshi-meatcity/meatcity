import { NextResponse } from 'next/server';
import { generateWhatsAppRateList } from '@/lib/pricing/b2b-pricing-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date') || undefined;

    const rateList = await generateWhatsAppRateList(dateParam);

    return NextResponse.json({
      success: true,
      ...rateList,
    });
  } catch (err: any) {
    console.error('[API B2B Rate List] GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate rate list' }, { status: 500 });
  }
}
