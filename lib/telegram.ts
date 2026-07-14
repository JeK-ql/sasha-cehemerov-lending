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
 * Повідомлення про створену заявку — шлеться з /api/checkout ДО оплати,
 * бо WayForPay-колбек не повертає адресу доставки. Менеджер відправляє
 * посилку лише після другого повідомлення «Оплату підтверджено» з тим же №.
 */
export function formatPendingOrderMessage(o: PendingOrder): string {
  const delivery =
    o.deliveryMode === 'np'
      ? `Нова Пошта: ${o.city}, ${o.warehouse}`
      : `Укрпошта: ${o.country}, ${o.city}, ${o.street}, буд. ${o.building}` +
        (o.flat ? `, кв. ${o.flat}` : '') +
        `, індекс ${o.zip}`;
  const sizesLine = Object.entries(o.sizes)
    .filter(([, n]) => n > 0)
    .map(([size, n]) => `${size} ×${n}`)
    .join(', ');
  return [
    '🕓 <b>Заявка (очікує оплати)</b>',
    `<b>№:</b> ${o.orderReference}`,
    `<b>Товар:</b> too much яром too much долиною · ${sizesLine}`,
    `<b>Сума:</b> ${o.amount} ₴`,
    '',
    `<b>Покупець:</b> ${o.fullName}`,
    `<b>Телефон:</b> ${o.phone}`,
    `<b>E-mail:</b> ${o.email}`,
    '',
    `<b>Доставка:</b> ${delivery}`,
  ].join('\n');
}

/** Підтвердження оплати — шлеться з WayForPay-колбека після Approved. */
export function formatPaidMessage(orderReference: string, amount: number): string {
  return [
    '✅ <b>Оплату підтверджено</b>',
    `<b>№:</b> ${orderReference}`,
    `<b>Сума:</b> ${amount} ₴`,
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
