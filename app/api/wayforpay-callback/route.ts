import { NextRequest, NextResponse } from 'next/server';
import { callbackSignature, responseSignature } from '@/lib/wayforpay';
import { formatPaidMessage, sendToTelegram } from '@/lib/telegram';
import { requireEnv } from '@/lib/config';

export async function POST(req: NextRequest) {
  const secret = requireEnv('WAYFORPAY_SECRET_KEY');
  const body = await req.json();

  // Перевірка автентичності колбеку
  const expected = callbackSignature(secret, {
    merchantAccount: body.merchantAccount,
    orderReference: body.orderReference,
    amount: body.amount,
    currency: body.currency,
    authCode: body.authCode,
    cardPan: body.cardPan,
    transactionStatus: body.transactionStatus,
    reasonCode: body.reasonCode,
  });

  if (expected === body.merchantSignature && body.transactionStatus === 'Approved') {
    try {
      await sendToTelegram(
        requireEnv('TELEGRAM_BOT_TOKEN'),
        requireEnv('TELEGRAM_CHAT_ID'),
        formatPaidMessage(body.orderReference, body.amount),
      );
    } catch (err) {
      console.error('Telegram notify failed', err);
    }
  }

  // Обовʼязкова підписана відповідь WayForPay
  const time = Math.floor(Date.now() / 1000);
  return NextResponse.json({
    orderReference: body.orderReference,
    status: 'accept',
    time,
    signature: responseSignature(secret, body.orderReference, 'accept', time),
  });
}
