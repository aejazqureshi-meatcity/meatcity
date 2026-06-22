import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                  !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

  if (useMock) {
    const cookieStr = request.cookies.get('meatcity_session')?.value || null;
    let user: any = null;

    if (cookieStr) {
      try {
        user = JSON.parse(decodeURIComponent(cookieStr));
      } catch (e) {
        console.error('Failed to parse meatcity_session cookie', e);
      }
    }

    const userRole = user?.user_metadata?.user_type || user?.user_type;
    const userStatus = user?.user_metadata?.status || user?.status;

    // Protect Admin Route (except for admin-dev bypass)
    if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin-dev') {
      if (userRole !== 'admin') {
        const dest = cookieStr ? '/' : '/login';
        return NextResponse.redirect(new URL(dest, request.url))
      }
    }

    // Protect Delivery Route
    if (request.nextUrl.pathname.startsWith('/delivery') && request.nextUrl.pathname !== '/delivery/login') {
      if (userRole !== 'delivery_partner') {
        return NextResponse.redirect(new URL('/delivery/login', request.url))
      }
    }

    // B2B Pending Approval logic (redirect to /pending if trying to shop)
    if (userRole === 'b2b' && userStatus === 'pending') {
      if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/cart') {
        return NextResponse.redirect(new URL('/pending', request.url))
      }
    }

    return response;
  }

  // Create real Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  let userRole = null;
  let userStatus = null;

  if (user) {
    // Read from public users table to get up-to-date role and status
    const { data: profile } = await supabase
      .from('users')
      .select('user_type, status')
      .eq('id', user.id)
      .single();

    if (profile) {
      userRole = profile.user_type;
      userStatus = profile.status;
    } else {
      // Fallback to auth metadata if profile doesn't exist yet
      userRole = user.user_metadata?.user_type || user.user_metadata?.role;
      userStatus = new Date().toISOString() === 'never' ? 'active' : user.user_metadata?.status;
    }
  }

  // Protect Admin Route (except for admin-dev bypass)
  if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin-dev') {
    if (userRole !== 'admin') {
      const dest = user ? '/' : '/login';
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // Protect Delivery Route
  if (request.nextUrl.pathname.startsWith('/delivery') && request.nextUrl.pathname !== '/delivery/login') {
    if (userRole !== 'delivery_partner') {
      return NextResponse.redirect(new URL('/delivery/login', request.url))
    }
  }

  // B2B Pending Approval logic (redirect to /pending if trying to shop)
  if (userRole === 'b2b' && userStatus === 'pending') {
    if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/cart') {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
