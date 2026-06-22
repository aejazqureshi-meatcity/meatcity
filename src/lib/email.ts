// Server-side helper to send order notification emails via Resend API
export async function sendOrderEmail(order: any) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 're_local_test_key' || apiKey === 'your_resend_api_key_here') {
      console.warn('Resend API key is not configured or is using default placeholder. Skipping email dispatch.');
      return { success: false, error: 'Resend API key not configured' };
    }

    const items = order.items || [];
    const itemsList = items.map((item: any) => {
      const name = item.product_name || item.name || 'Cut';
      const qty = item.quantity || item.qty || 1;
      const price = item.price || item.unit_price || 0;
      return `- ${name} x ${qty} (₹${price})`;
    }).join('\n');

    const subject = `🔔 New MeatCity Order #${order.id}`;
    const body = `Order Number: #${order.id}
Customer Name: ${order.customer_name}
Mobile Number: ${order.customer_phone}
Address: ${order.delivery_address}
Delivery Slot: ${order.delivery_slot || 'ASAP'}
Payment Method: ${order.payment_method || 'COD'}
Total Amount: ₹${order.total}

Ordered Items:
${itemsList}`;

    console.log(`Sending email notification to Resend for Order #${order.id}...`);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'MeatCity Orders <onboarding@resend.dev>',
        to: 'aejazqureshi36@gmail.com',
        subject: subject,
        text: body
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || JSON.stringify(data));
    }

    console.log(`Email sent successfully for Order #${order.id}:`, data);
    return { success: true, data };
  } catch (error) {
    console.error(`Resend email sending failed for Order #${order?.id}:`, error);
    return { success: false, error };
  }
}
