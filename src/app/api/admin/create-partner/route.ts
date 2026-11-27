import { readDb, writeDb } from '@/lib/supabase-mock-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function isMock() {
  return (
    process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here')
  );
}

// POST: Create or Repair Delivery Partner
export async function POST(request: Request) {
  try {
    const { name, email, mobile, password, status } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = mobile ? mobile.trim().replace(/\s+/g, '') : '';
    const cleanName = name.trim();
    const cleanStatus = status || 'active';

    if (isMock()) {
      const db = readDb();
      const existingUser = db.users.find(
        (u: any) =>
          u.email?.toLowerCase() === cleanEmail ||
          (cleanPhone && (u.phone === cleanPhone || u.mobile === cleanPhone))
      );

      if (existingUser) {
        // Update existing mock partner
        existingUser.name = cleanName;
        existingUser.full_name = cleanName;
        existingUser.phone = cleanPhone;
        existingUser.mobile = cleanPhone;
        existingUser.password = password;
        existingUser.status = cleanStatus;
        existingUser.user_type = 'delivery_partner';
        existingUser.role = 'delivery_partner';
        writeDb(db);
        return NextResponse.json({ success: true, user: existingUser, message: 'Existing mock partner updated.' });
      }

      const newPartner = {
        id: 'dp-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        name: cleanName,
        full_name: cleanName,
        email: cleanEmail,
        mobile: cleanPhone,
        phone: cleanPhone,
        password,
        status: cleanStatus,
        user_type: 'delivery_partner',
        role: 'delivery_partner',
      };

      db.users.push(newPartner);
      writeDb(db);
      return NextResponse.json({ success: true, user: newPartner });
    }

    const supabaseAdmin = getAdminClient();

    // 1. Check if user already exists in auth.users
    console.log(`[API ADMIN CREATE PARTNER] Checking existing auth users for: ${cleanEmail}`);
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuth = listData?.users.find((u) => u.email?.toLowerCase() === cleanEmail);

    let authUserId: string;

    if (existingAuth) {
      console.log(`[API ADMIN CREATE PARTNER] User exists in auth.users (${existingAuth.id}). Updating password and metadata...`);
      authUserId = existingAuth.id;

      // Update password, confirmed email, and metadata
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          phone: cleanPhone,
          user_type: 'delivery_partner',
          status: cleanStatus,
        },
      });

      if (updateAuthErr) {
        console.error('[API ADMIN CREATE PARTNER] Failed to update existing auth user:', updateAuthErr);
        return NextResponse.json({ error: updateAuthErr.message }, { status: 400 });
      }
    } else {
      // Create new user in auth.users
      console.log(`[API ADMIN CREATE PARTNER] Creating new auth user for: ${cleanEmail}`);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          phone: cleanPhone,
          user_type: 'delivery_partner',
          status: cleanStatus,
        },
      });

      if (authError) {
        console.error('[API ADMIN CREATE PARTNER ERROR] Auth registration failed:', authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      authUserId = authData.user.id;
    }

    // 2. Upsert profile in public.users using ONLY actual valid schema columns
    console.log(`[API ADMIN CREATE PARTNER] Upserting public.users record for: ${authUserId}`);
    const { data: userProfile, error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUserId,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        user_type: 'delivery_partner',
        status: cleanStatus,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[API ADMIN CREATE PARTNER ERROR] Public profile upsert failed:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    console.log(`[API ADMIN CREATE PARTNER] Delivery partner saved successfully: ${authUserId}`);
    return NextResponse.json({
      success: true,
      user: {
        id: authUserId,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        user_type: 'delivery_partner',
        status: cleanStatus,
      },
    });
  } catch (err: any) {
    console.error('[API ADMIN CREATE PARTNER ERROR] Caught exception:', err);
    return NextResponse.json({ error: err.message || 'Server error occurred.' }, { status: 500 });
  }
}

// PUT: Update Delivery Partner details or Reset Password
export async function PUT(request: Request) {
  try {
    const { id, name, email, mobile, password, status } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Delivery partner ID is required.' }, { status: 400 });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : undefined;
    const cleanPhone = mobile !== undefined ? mobile.trim().replace(/\s+/g, '') : undefined;
    const cleanName = name !== undefined ? name.trim() : undefined;
    const cleanStatus = status || undefined;

    if (isMock()) {
      const db = readDb();
      const user = db.users.find((u: any) => u.id === id);
      if (!user) {
        return NextResponse.json({ error: 'User not found in mock DB.' }, { status: 404 });
      }
      if (cleanName) { user.name = cleanName; user.full_name = cleanName; }
      if (cleanEmail) user.email = cleanEmail;
      if (cleanPhone !== undefined) { user.phone = cleanPhone; user.mobile = cleanPhone; }
      if (cleanStatus) user.status = cleanStatus;
      if (password) user.password = password;
      writeDb(db);
      return NextResponse.json({ success: true, user });
    }

    const supabaseAdmin = getAdminClient();

    // 1. Update Auth user (email, password, metadata) if changed
    const authUpdatePayload: any = {
      user_metadata: {},
    };

    if (cleanEmail) authUpdatePayload.email = cleanEmail;
    if (password && password.trim().length >= 6) {
      authUpdatePayload.password = password.trim();
      console.log(`[API ADMIN UPDATE PARTNER] Updating password for user: ${id}`);
    }
    if (cleanName) authUpdatePayload.user_metadata.full_name = cleanName;
    if (cleanPhone !== undefined) authUpdatePayload.user_metadata.phone = cleanPhone;
    if (cleanStatus) authUpdatePayload.user_metadata.status = cleanStatus;

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdatePayload);
    if (authErr) {
      console.warn('[API ADMIN UPDATE PARTNER] Warning updating auth user:', authErr.message);
    }

    // 2. Update public.users record
    const dbUpdatePayload: any = {};
    if (cleanName) dbUpdatePayload.full_name = cleanName;
    if (cleanEmail) dbUpdatePayload.email = cleanEmail;
    if (cleanPhone !== undefined) dbUpdatePayload.phone = cleanPhone;
    if (cleanStatus) dbUpdatePayload.status = cleanStatus;

    const { data: updatedProfile, error: dbErr } = await supabaseAdmin
      .from('users')
      .update(dbUpdatePayload)
      .eq('id', id)
      .select()
      .single();

    if (dbErr) {
      console.error('[API ADMIN UPDATE PARTNER ERROR] DB update failed:', dbErr);
      return NextResponse.json({ error: dbErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
      message: password ? 'Partner details and password updated successfully.' : 'Partner details updated successfully.',
    });
  } catch (err: any) {
    console.error('[API ADMIN UPDATE PARTNER ERROR] Caught exception:', err);
    return NextResponse.json({ error: err.message || 'Server error occurred.' }, { status: 500 });
  }
}

// DELETE: Delete Delivery Partner account from both public.users and auth.users
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Delivery partner ID is required.' }, { status: 400 });
    }

    if (isMock()) {
      const db = readDb();
      db.users = db.users.filter((u: any) => u.id !== id);
      writeDb(db);
      return NextResponse.json({ success: true, message: 'Partner deleted from mock DB.' });
    }

    const supabaseAdmin = getAdminClient();

    // 1. Delete from public.users
    const { error: dbErr } = await supabaseAdmin.from('users').delete().eq('id', id);
    if (dbErr) {
      console.error('[API ADMIN DELETE PARTNER ERROR] Failed to delete public.users profile:', dbErr);
    }

    // 2. Delete from auth.users
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) {
      console.warn('[API ADMIN DELETE PARTNER] Warning deleting auth user:', authErr.message);
    }

    return NextResponse.json({ success: true, message: 'Delivery partner deleted successfully.' });
  } catch (err: any) {
    console.error('[API ADMIN DELETE PARTNER ERROR] Caught exception:', err);
    return NextResponse.json({ error: err.message || 'Server error occurred.' }, { status: 500 });
  }
}
