import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readDb } from '@/lib/supabase-mock-server';

export interface AuthCheckResult {
  authorized: boolean;
  status?: number;
  error?: string;
  user?: any;
}

/**
 * Server-side helper to verify that an incoming API request is from an authenticated admin.
 * Evaluates both live Supabase sessions and mock mode sessions securely on the server.
 */
export async function verifyAdminSession(request: Request | NextRequest): Promise<AuthCheckResult> {
  const useMock =
    process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

  // --- MOCK DATABASE SESSION CHECK ---
  if (useMock) {
    let cookieStr: string | null = null;
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/meatcity_session=([^;]+)/);
    if (match) {
      cookieStr = decodeURIComponent(match[1]);
    }

    if (!cookieStr) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: No active session found. Please sign in.',
      };
    }

    let parsedUser: any = null;
    try {
      parsedUser = JSON.parse(cookieStr);
    } catch (e) {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Invalid session format.',
      };
    }

    const userRole = parsedUser?.user_metadata?.user_type || parsedUser?.user_type;
    if (userRole !== 'admin') {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Admin access required.',
      };
    }

    return { authorized: true, user: parsedUser };
  }

  // --- LIVE SUPABASE SERVER-SIDE SESSION CHECK ---
  const supabase = createClient();

  // 1. Check cookies-based session first
  let { data: { user } } = await supabase.auth.getUser();

  // 2. Check Authorization header (Bearer token) if cookie session not found
  if (!user) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: tokenData } = await supabase.auth.getUser(token);
      if (tokenData?.user) {
        user = tokenData.user;
      }
    }
  }

  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Authentication required. Please log in as an administrator.',
    };
  }

  // 3. Verify admin role from public.users table (security check)
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('id, user_type, status')
    .eq('id', user.id)
    .single();

  const userRole = profile?.user_type || user.user_metadata?.user_type;

  if (userRole !== 'admin') {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: Administrator privileges required to access AI Sales Agent endpoints.',
    };
  }

  return { authorized: true, user: { ...user, ...profile } };
}
