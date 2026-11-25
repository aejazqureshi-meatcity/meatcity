/**
 * MeatCity Telegram Order Notification Service
 * Secure server-side dispatch for B2B and B2C real-time order alerts.
 * Fail-safe: Notification errors are logged and never block customer checkout or payment.
 */

// In-memory set to track sent order IDs during warm lambda lifecycle
const notifiedOrderIds = new Set<string>();

interface TelegramButton {
  text: string;
  url: string;
}

interface SendTelegramOptions {
  replyMarkup?: {
    inline_keyboard: TelegramButton[][];
  };
}

export interface OrderAlertOptions {
  isRecovery?: boolean;
  force?: boolean;
}

/**
 * Send raw message via Telegram Bot API
 */
export async function sendTelegramMessage(
  text: string,
  options?: SendTelegramOptions,
  customChatId?: string,
  customToken?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = customToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = customChatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.warn('[Telegram Notification] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Skipping alert dispatch.');
      return { success: false, error: 'Telegram credentials not configured' };
    }

    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };

    if (options?.replyMarkup) {
      payload.reply_markup = options.replyMarkup;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok || !data.ok) {
      const errMsg = data.description || `HTTP ${res.status}`;
      console.error('[Telegram Notification] API error:', errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, data: data.result };
  } catch (err: any) {
    console.error('[Telegram Notification] Exception:', err.message || err);
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Fetch authoritative order from Supabase if payload is minimal or missing items
 */
async function fetchAuthoritativeOrder(orderId: string): Promise<any | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yvbhclahfwcimopbfetc.supabase.co';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceKey) return null;

    const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0];
    }
  } catch (err) {
    console.warn('[Telegram Notification] Error fetching order from Supabase:', err);
  }
  return null;
}

/**
 * Format order into rich HTML message for Telegram
 */
export function formatTelegramOrderMessage(order: any, options?: OrderAlertOptions): {
  message: string;
  adminUrl: string;
} {
  const orderKey = String(order.id);
  const isRecovery = Boolean(options?.isRecovery);

  const userRole = (order.order_type || order.user_role || order.role || (order.business_name ? 'b2b' : 'b2c')).toLowerCase();
  const isB2B = userRole === 'b2b';
  const customerType = isB2B ? '🏢 B2B Wholesale' : '🛒 B2C Retail';

  const customerName = order.customer_name || 'Valued Customer';
  const businessName = isB2B && order.business_name ? ` (${order.business_name})` : '';
  
  let rawPhone = String(order.customer_phone || '').trim();
  if (rawPhone.startsWith('+91')) {
    rawPhone = rawPhone.replace('+91', '').trim();
  }
  const phone = rawPhone ? `+91 ${rawPhone}` : 'N/A';

  // Format ordered items
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsList = items.map((item: any) => {
    const name = item.product_name || item.name || 'Cut';
    const qty = item.quantity || item.qty || 1;
    const isFree = item.is_free_reward === true || item.price === 0;
    const price = item.total != null ? item.total : ((item.price || item.unit_price || 0) * qty);
    const priceText = isFree ? '🎁 FREE REWARD' : `₹${Number(price).toLocaleString('en-IN')}`;
    return `  • <b>${escapeHtml(name)}</b> × ${qty} — <i>${priceText}</i>`;
  }).join('\n') || '  • Fresh Cuts Selection';

  // Financial calculations
  const subtotalVal = Number(order.subtotal != null ? order.subtotal : (order.total || 0));
  const discountVal = Number(order.discount || order.coupon_discount || order.points_discount || 0);
  const deliveryFeeVal = Number(order.delivery_fee != null ? order.delivery_fee : (order.delivery_charge || 0));
  const totalVal = Number(order.total || (subtotalVal - discountVal + deliveryFeeVal));

  const subtotalText = `₹${subtotalVal.toLocaleString('en-IN')}`;
  const discountText = discountVal > 0 ? `₹${discountVal.toLocaleString('en-IN')}` : '₹0';
  const deliveryFeeText = isB2B ? 'Free Commercial Delivery' : (deliveryFeeVal === 0 ? 'Free Standard Delivery' : `₹${deliveryFeeVal.toLocaleString('en-IN')}`);
  const totalAmount = `₹${totalVal.toLocaleString('en-IN')}`;

  // Payment details
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
  
  // Order timestamp in Indian Standard Time
  const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const headerTitle = isRecovery 
    ? `🔔 <b>MEATCITY — NEW ORDER RECEIVED [RECOVERED ORDER ALERT]</b>`
    : `🔔 <b>MEATCITY — NEW ORDER RECEIVED</b>`;

  const message = `${headerTitle}
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

  return { message, adminUrl };
}

/**
 * Send formatted MeatCity Order Alert
 */
export async function sendTelegramOrderAlert(
  orderPayload: any, 
  options?: OrderAlertOptions
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!orderPayload || (!orderPayload.id && !orderPayload.orderId)) {
      return { success: false, error: 'Invalid order payload' };
    }

    const orderId = String(orderPayload.id || orderPayload.orderId);

    // 1. Duplicate alert prevention (idempotency check)
    if (!options?.force && !options?.isRecovery && notifiedOrderIds.has(orderId)) {
      console.log(`[Telegram Notification] Order #${orderId} already notified in current runtime. Skipping.`);
      return { success: true, error: 'Already notified' };
    }

    // 2. Fetch authoritative database order record if items are missing
    let order = orderPayload;
    if (!Array.isArray(order.items) || order.items.length === 0) {
      const dbOrder = await fetchAuthoritativeOrder(orderId);
      if (dbOrder) {
        order = { ...order, ...dbOrder };
      }
    }

    // 3. Format message and deep link
    const { message, adminUrl } = formatTelegramOrderMessage(order, options);

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🔍 View Order in Admin Panel',
            url: adminUrl,
          },
        ],
      ],
    };

    // 4. Dispatch message via Telegram API
    const result = await sendTelegramMessage(message, { replyMarkup });

    if (result.success) {
      notifiedOrderIds.add(orderId);
      console.log(`[Telegram Notification] Successfully dispatched alert for Order #${orderId} (isRecovery: ${Boolean(options?.isRecovery)})`);
    }

    return result;
  } catch (err: any) {
    console.error(`[Telegram Notification] Unexpected error processing Order #${orderPayload?.id}:`, err);
    return { success: false, error: err.message || 'Notification failure' };
  }
}

/**
 * Send test confirmation alert to verify Telegram connection
 */
export async function sendTelegramTestAlert(
  customChatId?: string,
  customToken?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const testMessage = `🥩 <b>MEATCITY ORDER ALERTS — CONNECTION VERIFIED ✅</b>
━━━━━━━━━━━━━━━━━━━━━━
🤖 <b>Bot Name:</b> @MeatCityOrderAlerts_bot
📡 <b>Service:</b> Real-time Order Notification Engine
⏱️ <b>Verified At:</b> ${timestamp} IST
🌐 <b>Target:</b> https://www.meatcity.in

Your Telegram account is now successfully linked to MeatCity!
You will receive instant, automated notifications for every new B2B and B2C customer order placed on the platform.
━━━━━━━━━━━━━━━━━━━━━━`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '🌐 Open MeatCity Store',
          url: 'https://www.meatcity.in',
        },
        {
          text: '👑 Admin Dashboard',
          url: 'https://www.meatcity.in/admin',
        },
      ],
    ],
  };

  return sendTelegramMessage(testMessage, { replyMarkup }, customChatId, customToken);
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
