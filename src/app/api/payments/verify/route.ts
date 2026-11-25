import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';
import { sendOrderEmail } from '@/lib/email';
import { sendTelegramOrderAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      paymentType, // 'order' or 'repayment'
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      payload // contains orderPayload or repayment details
    } = body;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Check if we are running in mock payment mode (mock DB active or development)
    const isMock = process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true' || 
                   !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                   !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_project_url_here');

    if (!isMock) {
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Razorpay credentials not configured in production.' }, { status: 500 });
      }

      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment signature credentials.' }, { status: 400 });
      }

      // Perform server-side HMAC verification
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        console.error('Razorpay signature verification failed.');
        return NextResponse.json({ error: 'Payment verification failed. Security breach logged.' }, { status: 400 });
      }
    }

    // Initialize database client (retains user cookie auth context)
    const supabase = createClient();

    if (paymentType === 'order') {
      const { orderPayload } = payload;
      if (!orderPayload) {
        return NextResponse.json({ error: 'Missing order details.' }, { status: 400 });
      }

      // 1. Minimum order threshold validation
      const subtotal = Number(orderPayload.subtotal || 0);
      const userRole = orderPayload.user_role || orderPayload.role || 'b2c';
      if (userRole === 'b2b' && subtotal < 1000) {
        return NextResponse.json({ error: 'Minimum wholesale order of ₹1,000 required for B2B.' }, { status: 400 });
      }
      if (userRole === 'b2c' && subtotal < 200) {
        return NextResponse.json({ error: 'Minimum retail order of ₹200 required.' }, { status: 400 });
      }

      // 2. Check duplicate order processing (idempotency)
      const { data: existingOrder } = await supabase.from('orders').select('id, total, status').eq('id', orderPayload.id).single();
      if (existingOrder) {
        return NextResponse.json({ success: true, message: 'Order already verified and processed', orderId: existingOrder.id });
      }

      // 3. Stacking validation: coupons & loyalty cannot be combined
      if (orderPayload.coupon_code && (Number(orderPayload.points_redeemed || 0) > 0 || Number(orderPayload.points_discount || 0) > 0)) {
        return NextResponse.json({ error: 'Security policy: Coupons and loyalty points cannot be stacked.' }, { status: 400 });
      }

      // 4. Free reward claim verification
      if (orderPayload.claimed_reward_code) {
        const { data: claimData, error: claimErr } = await supabase
          .from('loyalty_reward_claims')
          .select('*')
          .eq('claim_code', orderPayload.claimed_reward_code)
          .single();

        if (claimErr || !claimData) {
          return NextResponse.json({ error: 'Invalid free reward claim code.' }, { status: 400 });
        }
        if (claimData.status !== 'active') {
          return NextResponse.json({ error: `Reward claim code is already ${claimData.status}.` }, { status: 400 });
        }
        if (claimData.expires_at && new Date().toISOString() > claimData.expires_at) {
          return NextResponse.json({ error: 'Reward claim code has expired.' }, { status: 400 });
        }
      }

      // Add payment verification details to the order payload
      const secureOrderPayload = {
        ...orderPayload,
        payment_status: 'Paid',
        payment_ref: razorpay_payment_id || 'mock_pay_id_' + Math.random().toString(36).substr(2, 9)
      };

      // Filter database payload to avoid PostgREST column schema mismatch errors
      const dbOrderPayload = {
        id: secureOrderPayload.id,
        user_id: secureOrderPayload.user_id,
        customer_name: secureOrderPayload.customer_name,
        business_name: secureOrderPayload.business_name,
        customer_phone: secureOrderPayload.customer_phone,
        delivery_address: secureOrderPayload.delivery_address,
        subtotal: secureOrderPayload.subtotal,
        discount: secureOrderPayload.discount,
        delivery_fee: secureOrderPayload.delivery_fee,
        total: secureOrderPayload.total,
        payment_method: secureOrderPayload.payment_method,
        payment_status: secureOrderPayload.payment_status,
        payment_ref: secureOrderPayload.payment_ref,
        status: secureOrderPayload.status,
        items: secureOrderPayload.items,
        delivery_slot: secureOrderPayload.delivery_slot,
        coupon_code: secureOrderPayload.coupon_code,
        coupon_discount: secureOrderPayload.coupon_discount,
        points_earned: secureOrderPayload.points_earned || 0,
        points_redeemed: secureOrderPayload.points_redeemed || 0,
        points_discount: secureOrderPayload.points_discount || 0,
        stamp_awarded: false,
        claimed_reward_code: secureOrderPayload.claimed_reward_code || null
      };

      // Write order directly to database
      let { error: orderError } = await supabase.from('orders').insert(dbOrderPayload);

      // Fail-safe schema cache fallback: if any optional/loyalty column triggers a PostgREST schema cache error,
      // retry with core verified orders schema so the verified payment order is recorded securely
      if (orderError && (
        orderError.message?.includes('schema cache') ||
        orderError.message?.includes('Could not find') ||
        orderError.code === 'PGRST204'
      )) {
        console.warn('[VERIFY SCHEMA CACHE FALLBACK] Retrying order insert with core fields due to:', orderError.message);
        const corePayload = {
          id: dbOrderPayload.id,
          user_id: dbOrderPayload.user_id,
          customer_name: dbOrderPayload.customer_name,
          business_name: dbOrderPayload.business_name,
          customer_phone: dbOrderPayload.customer_phone,
          delivery_address: dbOrderPayload.delivery_address,
          subtotal: dbOrderPayload.subtotal,
          discount: dbOrderPayload.discount,
          delivery_fee: dbOrderPayload.delivery_fee,
          total: dbOrderPayload.total,
          payment_method: dbOrderPayload.payment_method,
          payment_status: dbOrderPayload.payment_status,
          payment_ref: dbOrderPayload.payment_ref,
          status: dbOrderPayload.status,
          items: dbOrderPayload.items,
          delivery_slot: dbOrderPayload.delivery_slot
        };
        const retryResult = await supabase.from('orders').insert(corePayload);
        orderError = retryResult.error;
      }

      if (orderError) {
        console.error('[CRITICAL] Failed to save verified order to database:', {
          orderId: secureOrderPayload.id,
          userId: secureOrderPayload.user_id,
          errorMessage: orderError.message,
          code: orderError.code,
          details: orderError.details
        });
        return NextResponse.json({ 
          error: 'Order could not be saved due to a server error. Please contact MeatCity support with payment ID ' + secureOrderPayload.payment_ref 
        }, { status: 500 });
      }

      // Mark claimed reward code as redeemed in database
      if (secureOrderPayload.claimed_reward_code) {
        try {
          await supabase
            .from('loyalty_reward_claims')
            .update({
              status: 'redeemed',
              redeemed_order_id: secureOrderPayload.id,
              redeemed_at: new Date().toISOString()
            })
            .eq('claim_code', secureOrderPayload.claimed_reward_code);
        } catch (claimUpdateErr) {
          console.warn('[Payments Verify] Failed to update reward claim status:', claimUpdateErr);
        }
      }

      // If loyalty points were reserved for this order, commit the reservation
      if (secureOrderPayload.reservation_id) {
        try {
          await supabase.rpc('commit_loyalty_redemption', {
            p_reservation_id: secureOrderPayload.reservation_id,
            p_order_id: secureOrderPayload.id
          });
        } catch (loyaltyErr) {
          console.warn('[Payments Verify] Failed to commit loyalty points redemption:', loyaltyErr);
        }
      }

      // Insert notifications for user and admin
      try {
        await supabase.from('notifications').insert({
          user_id: secureOrderPayload.user_id,
          title: 'Order Placed successfully 🎉',
          message: `Your order ${secureOrderPayload.id} for ₹${secureOrderPayload.total} has been verified and placed.`,
          type: 'new_order'
        });

        await supabase.from('notifications').insert({
          user_id: 'd7b7b123-1234-5678-abcd-123456789abc', // Admin ID
          title: 'New Order Verified 📦',
          message: `Order ${secureOrderPayload.id} placed by ${secureOrderPayload.customer_name} for ₹${secureOrderPayload.total} has been paid and verified.`,
          type: 'new_order'
        });
      } catch (nErr) {
        console.error('Failed to trigger database notifications:', nErr);
      }

      // Send Resend email notification (errors logged, does not block return)
      try {
        await sendOrderEmail(dbOrderPayload);
      } catch (eErr) {
        console.error('Resend email dispatch error:', eErr);
      }

      // Send Telegram real-time order alert (fail-safe, non-blocking)
      try {
        await sendTelegramOrderAlert(dbOrderPayload);
      } catch (tErr) {
        console.error('Telegram order alert dispatch error:', tErr);
      }

      return NextResponse.json({ success: true, orderId: secureOrderPayload.id });

    } else if (paymentType === 'repayment') {
      const { userId, amount } = payload;
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'Missing repayment parameters.' }, { status: 400 });
      }

      const paymentRef = razorpay_payment_id || 'mock_pay_ref_' + Math.random().toString(36).substr(2, 9);

      // Create a verified payment entry
      const paymentPayload = {
        id: 'pay-' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        amount: amount,
        status: 'Verified',
        payment_method: 'Online (Razorpay)',
        payment_ref: paymentRef,
        created_at: new Date().toISOString()
      };

      const { error: payError } = await supabase.from('payments').insert(paymentPayload);
      if (payError) {
        console.error('Failed to save repayment record:', payError);
        return NextResponse.json({ error: 'Failed to save repayment: ' + payError.message }, { status: 500 });
      }

      // Update B2B user's ledger and available credit limit
      const { data: userProfile } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userProfile) {
        const newOutstanding = Math.max(0, (userProfile.outstanding_balance || 0) - amount);
        const newUsed = Math.max(0, (userProfile.credit_used || 0) - amount);
        const newAvailable = (userProfile.credit_limit || 50000) - newOutstanding;

        const ledgerEntry = {
          date: new Date().toISOString(),
          description: `Online Payment (Verified) - Ref: ${paymentRef}`,
          debit: 0,
          credit: amount,
          balance: newOutstanding
        };

        const updatedLedger = [...(userProfile.ledger || []), ledgerEntry];

        await supabase.from('users').update({
          outstanding_balance: newOutstanding,
          credit_used: newUsed,
          credit_available: newAvailable,
          last_payment_date: new Date().toISOString().split('T')[0],
          ledger: updatedLedger
        }).eq('id', userId);

        try {
          await supabase.from('notifications').insert({
            user_id: userId,
            title: 'Repayment Approved 👍',
            message: `Your payment of ₹${amount} has been verified. Available credit updated to ₹${newAvailable}.`,
            type: 'payment_repayment'
          });
        } catch (nErr) {
          console.error('Failed to send repayment notification:', nErr);
        }
      }

      return NextResponse.json({ success: true, paymentRef });
    }

    return NextResponse.json({ error: 'Invalid payment verification type.' }, { status: 400 });
  } catch (error: any) {
    console.error('Failed to verify payment:', error);
    return NextResponse.json({ error: error.message || 'Server error occurred.' }, { status: 500 });
  }
}
