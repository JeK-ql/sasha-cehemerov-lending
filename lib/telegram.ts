import type { RefundResult } from './inventory';

export interface PendingOrder {
  orderReference: string;
  productName: string;
  fullName: string;
  phone: string;
  email: string;
  /** Кількість по кожному розміру; в повідомлення потрапляють лише N>0. */
  sizes: Record<string, number>;
  amount: number;
  deliveryMode: 'np' | 'other';
  // Нова Пошта
  city: string;
  warehouse: string;
  // «Інше»: Укрпошта по Україні та за кордон
  country: string;
  street: string;
  building: string;
  flat: string;
  zip: string;
}

/**
 * Екранування для parse_mode: 'HTML'. Без нього «<» у полях покупця
 * (ім'я, адреса) ламає розбір повідомлення — Telegram відповідає 400,
 * і заявка не долітає до менеджерів.
 */
export function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * Повідомлення про створену заявку — шлеться з /api/checkout ДО оплати,
 * бо WayForPay-колбек не повертає адресу доставки. Менеджер відправляє
 * посилку лише після другого повідомлення «Оплату підтверджено» з тим же №.
 */
export function formatPendingOrderMessage(o: PendingOrder): string {
  const esc = escapeHtml;
  const delivery =
    o.deliveryMode === 'np'
      ? `Нова Пошта: ${esc(o.city)}, ${esc(o.warehouse)}`
      : `Укрпошта: ${esc(o.country)}, ${esc(o.city)}, ${esc(o.street)}, буд. ${esc(o.building)}` +
        (o.flat ? `, кв. ${esc(o.flat)}` : '') +
        `, індекс ${esc(o.zip)}`;
  const sizesLine = Object.entries(o.sizes)
    .filter(([, n]) => n > 0)
    .map(([size, n]) => `${size} ×${n}`)
    .join(', ');
  return [
    '🕓 <b>Заявка (очікує оплати)</b>',
    `<b>№:</b> ${esc(o.orderReference)}`,
    `<b>Товар:</b> ${esc(o.productName)} · ${sizesLine}`,
    `<b>Сума:</b> ${o.amount} ₴`,
    '',
    `<b>Покупець:</b> ${esc(o.fullName)}`,
    `<b>Телефон:</b> ${esc(o.phone)}`,
    `<b>E-mail:</b> ${esc(o.email)}`,
    '',
    `<b>Доставка:</b> ${delivery}`,
  ].join('\n');
}

/** Підтвердження оплати — шлеться з WayForPay-колбека після Approved. */
export function formatPaidMessage(orderReference: string, amount: number): string {
  return [
    '✅ <b>Оплату підтверджено</b>',
    `<b>№:</b> ${escapeHtml(orderReference)}`,
    `<b>Сума:</b> ${escapeHtml(String(amount))} ₴`,
  ].join('\n');
}

/**
 * Повернення коштів. Текст залежить від того, що фактично сталося зі
 * складом (`RefundResult`) — інакше повідомлення може сказати менеджеру
 * зробити те, що вже зроблено автоматично (або навпаки).
 */
export function formatRefundedMessage(
  orderReference: string,
  amount: number,
  result: RefundResult,
): string {
  if (result === 'unknown') {
    return [
      '❓ <b>Повернення коштів: замовлення не знайдено</b>',
      `<b>№:</b> ${escapeHtml(orderReference)}`,
      `<b>Сума:</b> ${escapeHtml(String(amount))} ₴`,
      '',
      'Такого замовлення немає в базі. Перевірте статус вручну.',
    ].join('\n');
  }

  const isRedelivered = result === 'already-refunded' || result === 'already-refunded-restocked';
  const head = isRedelivered
    ? '↩️ <b>Повернення коштів (повторний колбек)</b>'
    : '↩️ <b>Повернення коштів</b>';

  const stockLine =
    result === 'refunded-restocked' || result === 'already-refunded-restocked'
      ? 'Одиниця складу повернена автоматично — додаткових дій не потрібно.'
      : result === 'refunded-already-back'
        ? [
            'Одиниця складу вже була повернена автоматично раніше',
            '(заявку звільнено ще до цього повернення коштів) — додаткових дій не потрібно.',
          ].join(' ')
        : [
            'Одиниця складу автоматично НЕ повернена.',
            'Якщо товар фізично повернувся у продаж — поверніть його командою npm run seed:stock.',
          ].join('\n');

  return [
    head,
    `<b>№:</b> ${escapeHtml(orderReference)}`,
    `<b>Сума:</b> ${escapeHtml(String(amount))} ₴`,
    '',
    stockLine,
  ].join('\n');
}

/** Надсилає повідомлення в чат менеджерів. */
export async function sendToTelegram(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status}`);
}
