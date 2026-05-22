interface OrderMessage {
  orderReference: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  warehouse: string;
  amount: number;
}

/** HTML-повідомлення для чату менеджерів. */
export function formatOrderMessage(o: OrderMessage): string {
  return [
    '🛒 <b>Нове замовлення</b>',
    `<b>№:</b> ${o.orderReference}`,
    `<b>Товар:</b> too much яром too much долиною`,
    `<b>Сума:</b> ${o.amount} ₴`,
    '',
    `<b>Покупець:</b> ${o.fullName}`,
    `<b>Телефон:</b> ${o.phone}`,
    `<b>E-mail:</b> ${o.email}`,
    '',
    `<b>Доставка:</b> ${o.city}, ${o.warehouse}`,
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
