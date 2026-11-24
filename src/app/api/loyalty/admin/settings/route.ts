import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { getLoyaltySettings, updateLoyaltySettings } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const settings = await getLoyaltySettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Admin authorization required' }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const updated = await updateLoyaltySettings(body, auth.user.id);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error('[API Admin Loyalty Settings] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
