import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface AuthCheckResult {
  authorized: boolean;
  status?: number;
  error?: string;
  user?: any;
}

/**
 * Server-side helper to verify that an incoming API request is from an authenticated admin.
 * Enforces strict production fail-closed security:
 * - Mock authentication is NEVER permitted when NODE_ENV === 'production'.
 * - Missing or invalid Supabase environment variables in production fail closed.
 * - Client-supplied JSON cookies (such as meatcity_session) are NEVER trusted as proof of admin identity.
 * - Admin authorization relies EXCLUSIVELY on trusted server-side public.users.user_type records.
 * - Never falls back to client-manipulable user_metadata.
 * - Account status is verified (suspended, inactive, or pending accounts are denied).
 */
export async function verifyAdminSession(request: Request | NextRequest): Promise<AuthCheckResult> {
  const isProduction = process.env.NODE_ENV === 'production';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const hasValidSupabaseConfig = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_supabase_project_url_here')
  );

  // 1. Production Fail-Closed Check: If live DB credentials are missing in production, fail closed immediately
  if (isProduction && !hasValidSupabaseConfig) {
    console.error('[AUTH CRITICAL] Production Supabase environment variables are missing or invalid.');
    return {
      authorized: false,
      status: 500,
      error: 'Authentication configuration error: Production database environment is not configured.',
    };
  }

  // 2. Mock mode: Only permitted in non-production when explicitly configured and live DB is not available
  const allowMock = !isProduction && process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';

  if (allowMock && !hasValidSupabaseConfig) {
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
    } catch {
      return {
        authorized: false,
        status: 401,
        error: 'Unauthorized: Invalid session format.',
      };
    }

    const userRole = parsedUser?.user_type;
    if (userRole !== 'admin') {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Admin access required.',
      };
    }

    return { authorized: true, user: parsedUser };
  }

  // 3. Live Supabase Server-Side Verification
  try {
    const supabase = createServerSupabase();

    // Verify session from secure HTTP-only cookies
    let { data: { user } } = await supabase.auth.getUser();

    // Verify Bearer authorization header if cookie session is not present
    if (!user) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        const { data: tokenData, error: tokenError } = await supabase.auth.getUser(token);
        if (!tokenError && tokenData?.user) {
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

    // 4. Query trusted public.users database record
    // Use server client to ensure reliable access to public.users table
    let profile: any = null;
    let profileErr: any = null;

    if (serviceRoleKey && supabaseUrl) {
      const adminDb = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const res = await adminDb
        .from('users')
        .select('id, user_type, status')
        .eq('id', user.id)
        .single();
      profile = res.data;
      profileErr = res.error;
    } else {
      const res = await supabase
        .from('users')
        .select('id, user_type, status')
        .eq('id', user.id)
        .single();
      profile = res.data;
      profileErr = res.error;
    }

    if (profileErr || !profile) {
      console.warn(`[AUTH] Admin access denied: No database profile for user ${user.id}`);
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: User profile not found in database.',
      };
    }

    // 5. Strict Role Check from Database
    // NEVER rely on client-manipulable user.user_metadata
    if (profile.user_type !== 'admin') {
      console.warn(`[AUTH] Access denied: User ${user.id} has role '${profile.user_type}', expected 'admin'`);
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Administrator privileges required to access AI Sales Agent endpoints.',
      };
    }

    // 6. Account Status Check (Suspended, Inactive, or Pending accounts are denied)
    const isSuspendedOrInactive =
      profile.status === 'suspended' ||
      profile.status === 'inactive' ||
      profile.status === 'pending';

    if (isSuspendedOrInactive) {
      console.warn(`[AUTH] Admin access denied: Account ${user.id} status is '${profile.status}'`);
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Administrator account is suspended or inactive.',
      };
    }

    return { authorized: true, user: { ...user, ...profile } };
  } catch (err: any) {
    console.error('[AUTH] Server verification exception:', err);
    return {
      authorized: false,
      status: 500,
      error: 'An internal authentication error occurred.',
    };
  }
}
