import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data: rewards, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, rewards: rewards || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, points_cost, reward_type, voucher_discount_amount, min_order_spend, expiry_days, is_active } = body;

    if (!title || points_cost === undefined) {
      return NextResponse.json({ error: 'Title and points cost are required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    if (id) {
      // Update
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .update({
          title,
          description: description || '',
          points_cost: Number(points_cost),
          reward_type: reward_type || 'discount_voucher',
          voucher_discount_amount: Number(voucher_discount_amount || 0),
          min_order_spend: Number(min_order_spend || 0),
          expiry_days: Number(expiry_days || 30),
          is_active: is_active !== false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, reward: data });
    } else {
      // Create
      const { data, error } = await supabase
        .from('loyalty_rewards')
        .insert({
          title,
          description: description || '',
          points_cost: Number(points_cost),
          reward_type: reward_type || 'discount_voucher',
          voucher_discount_amount: Number(voucher_discount_amount || 0),
          min_order_spend: Number(min_order_spend || 0),
          expiry_days: Number(expiry_days || 30),
          is_active: is_active !== false
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, reward: data });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await verifyAdminSession(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { error } = await supabase.from('loyalty_rewards').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
