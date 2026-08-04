import type { RefundResult } from './inventory';

export interface PendingOrder {
  orderReference: string;
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
    `<b>Товар:</b> too much яром too much долиною · ${sizesLine}`,
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
    `<b>Сума:</b> ${amount} ₴`,
  ].join('\n');
}

/**
 * Повернення коштів. Склад автоматично не поповнюється — менеджер вирішує,
 * чи екземпляр фізично повернувся у продаж.
 */
export function formatRefundedMessage(
  orderReference: string,
  amount: number,
  result: RefundResult,
): string {
  const head =
    result === 'already-refunded'
      ? '↩️ <b>Повернення коштів (повторний колбек)</b>'
      : '↩️ <b>Повернення коштів</b>';
  return [
    head,
    `<b>№:</b> ${escapeHtml(orderReference)}`,
    `<b>Сума:</b> ${amount} ₴`,
    '',
    'Одиниця складу автоматично НЕ повернена.',
    'Якщо товар фізично повернувся у продаж — поверніть його командою npm run seed:stock.',
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
