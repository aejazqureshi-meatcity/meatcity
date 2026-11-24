import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { updateCustomerBirthday } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = await verifyUserSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { birthday } = body;

    if (!birthday) {
      return NextResponse.json({ error: 'Birthday date is required' }, { status: 400 });
    }

    const result = await updateCustomerBirthday(auth.user.id, String(birthday));
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[API Loyalty Birthday] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update birthday' }, { status: 500 });
  }
}
