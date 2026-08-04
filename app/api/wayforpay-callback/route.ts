import { NextRequest, NextResponse } from 'next/server';
import { callbackSignature, responseSignature } from '@/lib/wayforpay';
import { formatPaidMessage, formatRefundedMessage, escapeHtml, sendToTelegram } from '@/lib/telegram';
import { requireEnv } from '@/lib/config';
import { getDb } from '@/lib/mongo';
import {
  markOrderPaid,
  markOrderRefunded,
  releaseOrder,
  type MarkPaidResult,
  type RefundResult,
} from '@/lib/inventory';

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

  if (expected === body.merchantSignature) {
    if (body.transactionStatus === 'Approved') {
      // Фіксуємо оплату в базі: резерв стає остаточним списанням.
      // Помилка бази не блокує відповідь WayForPay — гроші вже прийняті.
      let paidResult: MarkPaidResult | 'db-error' = 'db-error';
      try {
        paidResult = await markOrderPaid(await getDb(), body.orderReference);
      } catch (err) {
        console.error('markOrderPaid failed', body.orderReference, err);
      }
      const messages = [formatPaidMessage(body.orderReference, body.amount)];
      if (paidResult === 'oversold') {
        messages.push(
          [
            '⚠️ <b>УВАГА: оплачено, але розмір уже розпродано</b>',
            `<b>№:</b> ${escapeHtml(body.orderReference)}`,
            'Резерв встиг звільнитись (оплата пізніше 30 хв), і залишку не вистачило.',
            "Зв'яжіться з покупцем: відправити з залишків іншого замовлення або повернути кошти.",
          ].join('\n'),
        );
      } else if (paidResult === 'db-error') {
        messages.push(
          [
            '⚠️ <b>УВАГА: оплату не записано в базу складу</b>',
            `<b>№:</b> ${escapeHtml(body.orderReference)}`,
            'Перевірте залишки вручну — резерв міг звільнитись за таймаутом.',
          ].join('\n'),
        );
      }
      // Кожне повідомлення — незалежно: падіння «Оплату підтверджено»
      // не має проковтнути критичне попередження про oversold.
      for (const text of messages) {
        try {
          await sendToTelegram(
            requireEnv('TELEGRAM_BOT_TOKEN'),
            requireEnv('TELEGRAM_CHAT_ID'),
            text,
          );
        } catch (err) {
          console.error('Telegram notify failed', body.orderReference, err);
        }
      }
    } else if (
      body.transactionStatus === 'Refunded' ||
      body.transactionStatus === 'Voided'
    ) {
      // Без цього повернена одиниця зникає зі складу назавжди: замовлення
      // лишається 'paid', а товару фізично вже може не бути.
      let refundResult: RefundResult | 'db-error' = 'db-error';
      try {
        refundResult = await markOrderRefunded(await getDb(), body.orderReference);
      } catch (err) {
        console.error('markOrderRefunded failed', body.orderReference, err);
      }
      const text =
        refundResult === 'db-error'
          ? [
              '⚠️ <b>УВАГА: повернення не записано в базу</b>',
              `<b>№:</b> ${escapeHtml(body.orderReference)}`,
              'Перевірте статус замовлення вручну.',
            ].join('\n')
          : formatRefundedMessage(body.orderReference, body.amount, refundResult);
      try {
        await sendToTelegram(
          requireEnv('TELEGRAM_BOT_TOKEN'),
          requireEnv('TELEGRAM_CHAT_ID'),
          text,
        );
      } catch (err) {
        console.error('Telegram refund notify failed', body.orderReference, err);
      }
    } else if (
      body.transactionStatus === 'Declined' ||
      body.transactionStatus === 'Expired'
    ) {
      // Оплата не відбулась — повертаємо резерв одразу, не чекаючи 30 хв.
      try {
        await releaseOrder(await getDb(), body.orderReference);
      } catch (err) {
        console.error('releaseOrder failed', body.orderReference, err);
      }
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
