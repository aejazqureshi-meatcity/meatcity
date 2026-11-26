import { NextResponse } from 'next/server';
import { verifyUserSession } from '@/lib/auth-server';
import { getServiceClient } from '@/lib/loyalty/loyalty-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'approved';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ success: true, reviews: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyUserSession(request);
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: 'Please log in to submit a review.' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, rating, comment, customerName } = body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Please provide a valid rating between 1 and 5 stars.' }, { status: 400 });
    }

    const trimmedComment = (comment || '').trim();
    if (!trimmedComment || trimmedComment.length < 3) {
      return NextResponse.json({ error: 'Please provide a meaningful comment (at least 3 characters).' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify order exists and belongs to user if orderId provided
    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, user_id, status')
        .eq('id', orderId)
        .maybeSingle();

      if (order && order.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'You can only review your own orders.' }, { status: 403 });
      }
    }

    const authorName = (customerName || auth.user.full_name || auth.user.name || auth.user.email || 'Verified Customer').trim();

    const { data: inserted, error: insertErr } = await supabase
      .from('reviews')
      .insert({
        user_id: auth.user.id,
        order_id: orderId || null,
        customer_name: authorName,
        rating: numRating,
        comment: trimmedComment,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[API Reviews] Insert error:', insertErr);
      throw insertErr;
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your review has been submitted for approval.',
      review: inserted,
    });
  } catch (err: any) {
    console.error('[API Reviews] POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit review' }, { status: 500 });
  }
}
