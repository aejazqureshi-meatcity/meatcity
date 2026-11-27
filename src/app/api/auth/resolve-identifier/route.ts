import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = (body.identifier || '').trim();

    if (!rawIdentifier) {
      return NextResponse.json({ error: 'Email or mobile number is required.' }, { status: 400 });
    }

    // 1. If identifier is already an email
    if (rawIdentifier.includes('@')) {
      const email = rawIdentifier.toLowerCase();
      return NextResponse.json({
        success: true,
        email,
        isPhone: false,
      });
    }

    // 2. Identifier is a phone number -> resolve corresponding email from public.users
    const digitsOnly = rawIdentifier.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return NextResponse.json({ error: 'Please enter a valid mobile number or email address.' }, { status: 400 });
    }

    const last10Digits = digitsOnly.slice(-10);

    const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';
    if (useMock) {
      try {
        const fs = require('fs');
        const path = require('path');
        const mockDbPath = path.join(process.cwd(), 'mock_db.json');
        if (fs.existsSync(mockDbPath)) {
          const mockDb = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
          const users = mockDb.users || [];
          const matched = users.find((u: any) => {
            const p = (u.phone || u.mobile || '').replace(/\D/g, '');
            return p.endsWith(last10Digits);
          });
          if (matched) {
            return NextResponse.json({
              success: true,
              email: matched.email,
              phone: matched.phone || matched.mobile,
              full_name: matched.full_name || matched.name,
              user_type: matched.user_type || matched.role,
              status: matched.status,
              isPhone: true,
            });
          }
        }
      } catch (err) {}
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Look for user by phone matching last 10 digits
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, phone, full_name, user_type, status')
      .ilike('phone', `%${last10Digits}%`)
      .limit(2);

    if (error) {
      console.error('[API RESOLVE IDENTIFIER] Supabase query error:', error);
      return NextResponse.json({ error: 'Unable to look up account by mobile number.' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: `No registered account found with mobile number ending in ${last10Digits}. Please verify the number or log in with your email.` },
        { status: 404 }
      );
    }

    const matchedUser = users[0];

    return NextResponse.json({
      success: true,
      email: matchedUser.email,
      phone: matchedUser.phone,
      full_name: matchedUser.full_name,
      user_type: matchedUser.user_type,
      status: matchedUser.status,
      isPhone: true,
    });
  } catch (err: any) {
    console.error('[API RESOLVE IDENTIFIER] Caught exception:', err);
    return NextResponse.json({ error: err.message || 'Server error occurred.' }, { status: 500 });
  }
}
