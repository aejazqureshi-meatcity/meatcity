import { readDb, writeDb } from '@/lib/supabase-mock-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name, email, mobile, password, status } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 })
    }

    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                    !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

    if (useMock) {
      const db = readDb();
      const existingUser = db.users.find((u: any) => 
        u.email?.toLowerCase() === email.toLowerCase() || 
        (mobile && (u.phone === mobile || u.mobile === mobile))
      );

      if (existingUser) {
        return NextResponse.json({ error: 'User with this email or mobile number already exists.' }, { status: 400 });
      }

      const newPartner = {
        id: 'dp-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        name,
        full_name: name,
        email,
        mobile,
        phone: mobile,
        password,
        status: status || 'active',
        user_type: 'delivery_partner',
        role: 'delivery_partner'
      };

      db.users.push(newPartner);
      writeDb(db);

      console.log(`[API ADMIN] Mock Delivery partner created successfully: ${newPartner.id}`);
      return NextResponse.json({ success: true, user: newPartner });
    }

    // Initialize administrative client using service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log(`[API ADMIN] Attempting to create auth user for delivery partner: ${email}`)

    // 1. Create auth user using administrative admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone: mobile,
        user_type: 'delivery_partner',
        status: status || 'active'
      }
    })

    if (authError) {
      console.error('[API ADMIN CREATE PARTNER ERROR] Auth registration failed:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const authUser = authData.user
    console.log(`[API ADMIN] Auth user created successfully: ${authUser.id}`)

    // 2. Upsert profile in public.users to ensure all metadata keys are populated
    const { error: dbError } = await supabaseAdmin.from('users').upsert({
      id: authUser.id,
      email,
      full_name: name,
      phone: mobile,
      user_type: 'delivery_partner',
      status: status || 'active',
      name,
      mobile,
      role: 'delivery_partner'
    })

    if (dbError) {
      console.error('[API ADMIN CREATE PARTNER ERROR] Public profile upsert failed:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    console.log(`[API ADMIN] Public profile synced successfully for: ${authUser.id}`)
    return NextResponse.json({ success: true, user: authUser })
  } catch (err: any) {
    console.error('[API ADMIN CREATE PARTNER ERROR] Caught exception:', err)
    return NextResponse.json({ error: err.message || 'Server error occurred.' }, { status: 500 })
  }
}
