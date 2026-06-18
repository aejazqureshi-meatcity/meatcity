import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { action, user } = await request.json();

    const response = NextResponse.json({ success: true });

    if (action === 'login' && user) {
      const value = encodeURIComponent(JSON.stringify(user));
      response.headers.append('Set-Cookie', `meatcity_session=${value}; Path=/; SameSite=Lax; Max-Age=2592000`); // 30 days
    } else if (action === 'logout') {
      response.headers.append('Set-Cookie', `meatcity_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`);
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Auth server error' }, { status: 500 });
  }
}
