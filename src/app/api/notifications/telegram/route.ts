import { NextResponse } from 'next/server';
import { sendTelegramOrderAlert, sendTelegramTestAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Test alert mode
    if (body.test === true) {
      const result = await sendTelegramTestAlert(body.chatId, body.token);
      return NextResponse.json(result);
    }

    const { order, orderId, isRecovery, force } = body;
    const targetOrder = order || (orderId ? { id: orderId } : null);

    if (!targetOrder || (!targetOrder.id && !targetOrder.orderId)) {
      return NextResponse.json({ error: 'Order details or orderId required' }, { status: 400 });
    }

    const result = await sendTelegramOrderAlert(targetOrder, {
      isRecovery: Boolean(isRecovery),
      force: Boolean(force),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Telegram Route] Error:', error);
    // Never fail with 500 in a way that disrupts the caller
    return NextResponse.json({ error: error.message || 'Server error', success: false }, { status: 200 });
  }
}
