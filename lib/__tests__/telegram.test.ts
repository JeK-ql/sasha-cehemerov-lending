import { describe, it, expect } from 'vitest';
import { formatPendingOrderMessage, formatPaidMessage, formatRefundedMessage } from '../telegram';

const base = {
  orderReference: 'DROP01-9',
  productName: 'too much яром too much долиною',
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'sasha@mail.com',
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 2, ВЕЛИКИЙ: 0 },
  amount: 5200,
  deliveryMode: 'np' as const,
  city: 'Львів',
  warehouse: 'Відділення №1',
  country: '',
  street: '',
  building: '',
  flat: '',
  zip: '',
};

describe('formatPendingOrderMessage', () => {
  it('includes order, buyer and NP delivery fields', () => {
    const msg = formatPendingOrderMessage(base);
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('СЕРЕДНІЙ ×2');
    expect(msg).not.toContain('МАЛЕНЬКИЙ');
    expect(msg).toContain('5200');
    expect(msg).toContain('Чемеров Олександр');
    expect(msg).toContain('+380671234567');
    expect(msg).toContain('sasha@mail.com');
    expect(msg).toContain('Нова Пошта');
    expect(msg).toContain('Львів');
    expect(msg).toContain('Відділення №1');
    expect(msg).toContain('очікує оплати');
  });

  it('formats the other-mode address with country, street and zip', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      deliveryMode: 'other',
      city: 'Kraków',
      warehouse: '',
      country: 'Польща',
      street: 'ul. Floriańska',
      building: '12',
      flat: '3',
      zip: '31-019',
    });
    expect(msg).toContain('Укрпошта');
    expect(msg).toContain('Польща');
    expect(msg).toContain('Kraków');
    expect(msg).toContain('ul. Floriańska');
    expect(msg).toContain('буд. 12');
    expect(msg).toContain('кв. 3');
    expect(msg).toContain('31-019');
  });

  it('omits the flat part when flat is empty', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      deliveryMode: 'other',
      country: 'Польща',
      street: 'ul. Floriańska',
      building: '12',
      flat: '',
      zip: '31-019',
    });
    expect(msg).not.toContain('кв.');
  });

  it('екранує HTML у полях покупця — «<» в адресі не ламає parse_mode', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      fullName: 'Тест <b>Жирний</b> & Ко',
      city: 'Київ',
      warehouse: 'вул. Шевченка <буд. 5>',
    });
    expect(msg).not.toContain('<b>Жирний</b>');
    expect(msg).toContain('&lt;b&gt;Жирний&lt;/b&gt; &amp; Ко');
    expect(msg).toContain('вул. Шевченка &lt;буд. 5&gt;');
    // Службова розмітка повідомлення лишається живою
    expect(msg).toContain('<b>Покупець:</b>');
  });

  it('lists every size with a non-zero count, comma-separated', () => {
    const msg = formatPendingOrderMessage({
      ...base,
      sizes: { МАЛЕНЬКИЙ: 2, СЕРЕДНІЙ: 1, ВЕЛИКИЙ: 0 },
    });
    expect(msg).toContain('МАЛЕНЬКИЙ ×2, СЕРЕДНІЙ ×1');
    expect(msg).not.toContain('ВЕЛИКИЙ');
  });

  it('назва товару в заявці береться з переданого поля, а не з константи', () => {
    const msg = formatPendingOrderMessage({
      orderReference: 'PEDAL01-1754200000000ab3z',
      productName: 'Димна Суміш',
      fullName: 'Олександр Чемеров',
      phone: '0671234567',
      email: 't@t.ua',
      sizes: { STANDARD: 1 },
      amount: 3000,
      deliveryMode: 'np',
      city: 'Київ',
      warehouse: 'Відділення №1',
      country: '',
      street: '',
      building: '',
      flat: '',
      zip: '',
    });
    expect(msg).toContain('Димна Суміш');
    expect(msg).not.toContain('too much');
    expect(msg).toContain('STANDARD ×1');
  });
});

describe('formatPaidMessage', () => {
  it('mentions the order reference and amount', () => {
    const msg = formatPaidMessage('DROP01-9', 5200);
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('5200');
    expect(msg).toContain('Оплату підтверджено');
  });
});

describe('formatRefundedMessage', () => {
  it('містить номер, суму і явну інструкцію менеджеру', () => {
    const msg = formatRefundedMessage('PEDAL01-1754200000000ab3z', 3000, 'refunded');
    expect(msg).toContain('PEDAL01-1754200000000ab3z');
    expect(msg).toContain('3000');
    expect(msg).toContain('seed:stock');
  });

  it('повторний колбек позначається окремо', () => {
    expect(formatRefundedMessage('PEDAL01-1', 3000, 'already-refunded')).toContain(
      'повторний',
    );
  });

  it('екранує HTML у номері замовлення', () => {
    expect(formatRefundedMessage('<b>x</b>', 1, 'refunded')).toContain('&lt;b&gt;');
  });
});
