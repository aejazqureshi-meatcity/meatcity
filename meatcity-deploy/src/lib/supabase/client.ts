import { createBrowserClient } from '@supabase/ssr';
import { MockSupabaseClient } from '../supabase-mock';

export function createClient() {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                  !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

  if (useMock) {
    return new MockSupabaseClient() as any;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
