import { describe, it, expect } from 'vitest';
import { formatPendingOrderMessage, formatPaidMessage } from '../telegram';

const base = {
  orderReference: 'DROP01-9',
  fullName: 'Чемеров Олександр',
  phone: '+380671234567',
  email: 'sasha@mail.com',
  size: 'СЕРЕДНІЙ',
  quantity: 2,
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
    expect(msg).toContain('розмір СЕРЕДНІЙ');
    expect(msg).toContain('×2');
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
});

describe('formatPaidMessage', () => {
  it('mentions the order reference and amount', () => {
    const msg = formatPaidMessage('DROP01-9', 5200);
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('5200');
    expect(msg).toContain('Оплату підтверджено');
  });
});
