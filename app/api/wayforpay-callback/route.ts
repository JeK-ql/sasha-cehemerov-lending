import { NextRequest, NextResponse } from 'next/server';
import { callbackSignature, responseSignature } from '@/lib/wayforpay';
import { formatPaidMessage, formatRefundedMessage, escapeHtml, sendToTelegram } from '@/lib/telegram';
import { requireEnv } from '@/lib/config';
import { getDb } from '@/lib/mongo';
import {
  findOrder,
  markOrderPaid,
  markOrderRefunded,
  orderProductId,
  releaseOrder,
  type MarkPaidResult,
  type RefundResult,
} from '@/lib/inventory';
import { getProduct } from '@/lib/products';
import { appendPaidOrderRow, sheetsCredsFromEnv } from '@/lib/ordersSheet';

/**
 * Дописує оплачене замовлення в Google Таблицю менеджерів. null — записано
 * (або таблиця не налаштована); рядок — попередження для Telegram: менеджер
 * має внести замовлення вручну. Оплату це ніколи не блокує.
 */
async function recordInSheet(orderReference: string): Promise<string | null> {
  const creds = sheetsCredsFromEnv();
  if (!creds) return null;
  try {
    const order = await findOrder(await getDb(), orderReference);
    const product = order && getProduct(orderProductId(order));
    if (!order || !product) throw new Error('order not found in db');
    await appendPaidOrderRow(creds, order, product, order.paidAt ?? new Date());
    return null;
  } catch (err) {
    console.error('Google Sheets append failed', orderReference, err);
    return [
      '⚠️ <b>Замовлення не записано в Google Таблицю</b>',
      `<b>№:</b> ${escapeHtml(orderReference)}`,
      'Внесіть рядок в аркуш «paid» вручну (дані — у повідомленні заявки з тим самим №).',
    ].join('\n');
  }
}

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
      // Кожен MarkPaidResult отримує чесне повідомлення: «Оплату
      // підтверджено» лише для результатів, що дійсно ним є. 'refunded' і
      // 'unknown' — колбек по замовленню, яке вже повернене або якого
      // взагалі нема в базі; підтвердження оплати тут ввело б менеджера в
      // оману і призвело б до відправки вже повернутого/невідомого товару.
      const messages: string[] = [];
      if (
        paidResult === 'paid' ||
        paidResult === 'already-paid' ||
        paidResult === 'paid-after-release'
      ) {
        messages.push(formatPaidMessage(body.orderReference, body.amount));
      } else if (paidResult === 'oversold') {
        messages.push(formatPaidMessage(body.orderReference, body.amount));
        messages.push(
          [
            '⚠️ <b>УВАГА: оплачено, але розмір уже розпродано</b>',
            `<b>№:</b> ${escapeHtml(body.orderReference)}`,
            'Резерв встиг звільнитись (оплата пізніше 10 хв), і залишку не вистачило.',
            "Зв'яжіться з покупцем: відправити з залишків іншого замовлення або повернути кошти.",
          ].join('\n'),
        );
      } else if (paidResult === 'db-error') {
        messages.push(formatPaidMessage(body.orderReference, body.amount));
        messages.push(
          [
            '⚠️ <b>УВАГА: оплату не записано в базу складу</b>',
            `<b>№:</b> ${escapeHtml(body.orderReference)}`,
            'Перевірте залишки вручну — резерв міг звільнитись за таймаутом.',
          ].join('\n'),
        );
      } else if (paidResult === 'refunded') {
        messages.push(
          [
            '⚠️ <b>УВАГА: підтверджено оплату по вже поверненому замовленню</b>',
            `<b>№:</b> ${escapeHtml(body.orderReference)}`,
            `<b>Сума:</b> ${escapeHtml(String(body.amount))} ₴`,
            'Кошти за це замовлення вже повернені покупцю раніше.',
            'НЕ відправляйте товар — спершу перевірте статус замовлення вручну.',
          ].join('\n'),
        );
      } else if (paidResult === 'unknown') {
        messages.push(
          [
            '⚠️ <b>УВАГА: підтвердження оплати по невідомому замовленню</b>',
            `<b>№:</b> ${escapeHtml(body.orderReference)}`,
            `<b>Сума:</b> ${escapeHtml(String(body.amount))} ₴`,
            'Такого замовлення немає в базі. Перевірте статус вручну перед відправкою товару.',
          ].join('\n'),
        );
      }
      // Оплачене замовлення — у таблицю менеджерів. Повторний колбек
      // ('already-paid') теж пробуємо: якщо перша спроба впала, друга
      // допише рядок, а дубль відсіє перевірка № у самій таблиці.
      if (
        paidResult === 'paid' ||
        paidResult === 'already-paid' ||
        paidResult === 'paid-after-release' ||
        paidResult === 'oversold'
      ) {
        const sheetWarning = await recordInSheet(body.orderReference);
        if (sheetWarning) messages.push(sheetWarning);
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
      // Оплата не відбулась — повертаємо резерв одразу, не чекаючи 10 хв.
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
