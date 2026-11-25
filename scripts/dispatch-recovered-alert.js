require('dotenv').config({ path: '.env.local' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yvbhclahfwcimopbfetc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function dispatchRecoveredAlert() {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured in environment');
  }

  console.log('Retrieving order ORD-647585 from Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.ORD-647585`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  const orders = await res.json();
  if (!orders || orders.length === 0) {
    throw new Error('Order ORD-647585 not found in Supabase');
  }

  const order = orders[0];
  console.log('Found order:', order.id, 'Total: ₹' + order.total, 'Items:', order.items.length);

  const orderKey = String(order.id);
  const userRole = (order.order_type || (order.business_name ? 'b2b' : 'b2c')).toLowerCase();
  const isB2B = userRole === 'b2b';
  const customerType = isB2B ? '🏢 B2B Wholesale' : '🛒 B2C Retail';
  const customerName = order.customer_name || 'Valued Customer';
  const businessName = isB2B && order.business_name ? ` (${order.business_name})` : '';

  let rawPhone = String(order.customer_phone || '').trim();
  if (rawPhone.startsWith('+91')) {
    rawPhone = rawPhone.replace('+91', '').trim();
  }
  const phone = rawPhone ? `+91 ${rawPhone}` : 'N/A';

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsList = items.map((item) => {
    const name = item.product_name || item.name || 'Cut';
    const qty = item.quantity || item.qty || 1;
    const isFree = item.is_free_reward === true || item.price === 0;
    const price = item.total != null ? item.total : ((item.price || item.unit_price || 0) * qty);
    const priceText = isFree ? '🎁 FREE REWARD' : `₹${Number(price).toLocaleString('en-IN')}`;
    return `  • <b>${escapeHtml(name)}</b> × ${qty} — <i>${priceText}</i>`;
  }).join('\n') || '  • Fresh Cuts Selection';

  const subtotalVal = Number(order.subtotal != null ? order.subtotal : (order.total || 0));
  const discountVal = Number(order.discount || order.coupon_discount || order.points_discount || 0);
  const deliveryFeeVal = Number(order.delivery_fee != null ? order.delivery_fee : (order.delivery_charge || 0));
  const totalVal = Number(order.total || (subtotalVal - discountVal + deliveryFeeVal));

  const subtotalText = `₹${subtotalVal.toLocaleString('en-IN')}`;
  const discountText = discountVal > 0 ? `₹${discountVal.toLocaleString('en-IN')}` : '₹0';
  const deliveryFeeText = isB2B ? 'Free Commercial Delivery' : (deliveryFeeVal === 0 ? 'Free Standard Delivery' : `₹${deliveryFeeVal.toLocaleString('en-IN')}`);
  const totalAmount = `₹${totalVal.toLocaleString('en-IN')}`;

  const rawPaymentMethod = String(order.payment_method || 'COD').toUpperCase();
  let paymentMethod = rawPaymentMethod;
  if (rawPaymentMethod === 'CREDIT') paymentMethod = 'Commercial Credit (Pay Later)';
  else if (rawPaymentMethod === 'COD') paymentMethod = 'Cash on Delivery (COD)';
  else if (rawPaymentMethod === 'UPI') paymentMethod = 'UPI QR Instant Pay';
  else if (rawPaymentMethod === 'RAZORPAY') paymentMethod = 'Razorpay Online';

  const rawPaymentStatus = String(order.payment_status || 'Pending').toLowerCase();
  let paymentStatusIcon = '⏳ Pending / Pay on Delivery';
  if (rawPaymentStatus === 'paid' || rawPaymentStatus === 'captured') {
    paymentStatusIcon = '🟢 Paid & Verified';
  } else if (rawPaymentMethod === 'CREDIT') {
    paymentStatusIcon = '📜 Credit Ledger (Pending Settlement)';
  }

  const deliverySlot = order.delivery_slot || 'ASAP Delivery';
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const message = `🔔 <b>MEATCITY — NEW ORDER RECEIVED [RECOVERED ORDER ALERT]</b>
━━━━━━━━━━━━━━━━━━━━━━
📦 <b>Order ID:</b> <code>#${escapeHtml(orderKey)}</code>
🏷️ <b>Order Type:</b> ${customerType}
👤 <b>Customer:</b> <b>${escapeHtml(customerName)}</b>${escapeHtml(businessName)}
📞 <b>Contact:</b> <code>${escapeHtml(phone)}</code>
📍 <b>Delivery Address:</b> <i>${escapeHtml(order.delivery_address || 'Navi Mumbai')}</i>
⏰ <b>Delivery Slot:</b> ${escapeHtml(deliverySlot)}
━━━━━━━━━━━━━━━━━━━━━━
🍗 <b>Ordered Items:</b>
${itemsList}
━━━━━━━━━━━━━━━━━━━━━━
💵 <b>Subtotal:</b> ${subtotalText}
🎟️ <b>Discount:</b> ${discountText}
🚚 <b>Delivery Fee:</b> ${escapeHtml(deliveryFeeText)}
💰 <b>Total Amount:</b> <b>${totalAmount}</b>
💳 <b>Payment Method:</b> ${escapeHtml(paymentMethod)}
⚡ <b>Payment Status:</b> ${paymentStatusIcon}
🕒 <b>Order Time:</b> ${orderDate} IST
━━━━━━━━━━━━━━━━━━━━━━`;

  const adminUrl = `https://www.meatcity.in/admin?tab=orders&order=${encodeURIComponent(orderKey)}`;

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔍 View Order in Admin Panel',
            url: adminUrl
          }
        ]
      ]
    }
  };

  const teleRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const teleData = await teleRes.json();
  if (!teleData.ok) {
    throw new Error('Telegram API dispatch failed: ' + teleData.description);
  }

  console.log('SUCCESS! Recovered order alert delivered with message_id:', teleData.result.message_id);
}

dispatchRecoveredAlert().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
