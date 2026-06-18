import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { MockSupabaseClient } from '../supabase-mock';

export function createClient() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                  !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

  if (useMock) {
    return new MockSupabaseClient(() => {
      return cookies().get('meatcity_session')?.value || null;
    }) as any;
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignored when called from Server Components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignored when called from Server Components
          }
        },
      },
    }
  );
}
