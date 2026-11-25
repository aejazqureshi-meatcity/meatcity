/**
 * MeatCity Telegram Order Notification Service
 * Secure server-side dispatch for B2B and B2C real-time order alerts.
 * Fail-safe: Notification errors are logged and never block customer checkout or payment.
 */

// Set to track sent order IDs to prevent duplicate alerts within server lifecycle
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

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

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
 * Send formatted MeatCity Order Alert
 */
export async function sendTelegramOrderAlert(order: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!order || !order.id) {
      return { success: false, error: 'Invalid order payload' };
    }

    // 1. Duplicate alert prevention (idempotency)
    const orderKey = String(order.id);
    if (notifiedOrderIds.has(orderKey)) {
      console.log(`[Telegram Notification] Order #${orderKey} already notified. Skipping duplicate alert.`);
      return { success: true, error: 'Already notified' };
    }

    // 2. Format order details
    const userRole = (order.user_role || order.role || (order.business_name ? 'b2b' : 'b2c')).toLowerCase();
    const isB2B = userRole === 'b2b';
    const customerType = isB2B ? '🏢 B2B Wholesale' : '🛒 B2C Retail';

    const customerName = order.customer_name || 'Valued Customer';
    const businessName = isB2B && order.business_name ? ` (${order.business_name})` : '';
    const phone = order.customer_phone ? `+91 ${order.customer_phone}` : 'N/A';

    // Format ordered items
    const items = order.items || [];
    const itemsList = items.map((item: any) => {
      const name = item.product_name || item.name || 'Cut';
      const qty = item.quantity || item.qty || 1;
      const isFree = item.is_free_reward || item.price === 0;
      const priceText = isFree ? '🎁 FREE' : `₹${item.total || ((item.price || item.unit_price || 0) * qty)}`;
      return `  • <b>${escapeHtml(name)}</b> × ${qty} — <i>${priceText}</i>`;
    }).join('\n') || '  • Standard Meat Cuts';

    // Formatting totals and payment
    const totalAmount = `₹${Number(order.total || 0).toLocaleString('en-IN')}`;
    const paymentMethod = order.payment_method || 'COD';
    const paymentStatus = order.payment_status || 'Pending';
    const paymentStatusIcon = paymentStatus.toLowerCase() === 'paid' ? '🟢 Paid' : '⏳ Pending / Pay on Delivery';

    const deliveryType = isB2B ? 'Free Commercial Delivery' : (Number(order.delivery_fee || 0) === 0 ? 'Free Standard Delivery' : `Standard Delivery (₹${order.delivery_fee})`);
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

    // 3. Compose rich Telegram HTML message
    const message = `🥩 <b>MEATCITY — NEW ORDER ALERT</b> 🔔
━━━━━━━━━━━━━━━━━━━━━━
📦 <b>Order ID:</b> <code>#${escapeHtml(orderKey)}</code>
🏷️ <b>Customer Type:</b> ${customerType}
👤 <b>Customer:</b> <b>${escapeHtml(customerName)}</b>${escapeHtml(businessName)}
📞 <b>Contact:</b> <code>${escapeHtml(phone)}</code>
📍 <b>Address:</b> <i>${escapeHtml(order.delivery_address || 'Navi Mumbai')}</i>
━━━━━━━━━━━━━━━━━━━━━━
🍗 <b>Ordered Items:</b>
${itemsList}
━━━━━━━━━━━━━━━━━━━━━━
💰 <b>Total Amount:</b> <b>${totalAmount}</b>
💳 <b>Payment Method:</b> ${escapeHtml(paymentMethod)}
⚡ <b>Payment Status:</b> ${paymentStatusIcon}
🚚 <b>Delivery Type:</b> ${escapeHtml(deliveryType)}
⏰ <b>Delivery Slot:</b> ${escapeHtml(deliverySlot)}
🕒 <b>Order Date:</b> ${orderDate} IST
━━━━━━━━━━━━━━━━━━━━━━`;

    // 4. Admin panel deep link button
    const adminUrl = `https://www.meatcity.in/admin?tab=orders&orderId=${encodeURIComponent(orderKey)}`;
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

    // 5. Dispatch message
    const result = await sendTelegramMessage(message, { replyMarkup });

    if (result.success) {
      notifiedOrderIds.add(orderKey);
      console.log(`[Telegram Notification] Successfully dispatched alert for Order #${orderKey}`);
    }

    return result;
  } catch (err: any) {
    console.error(`[Telegram Notification] Unexpected error processing Order #${order?.id}:`, err);
    // Never throw or fail caller
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
