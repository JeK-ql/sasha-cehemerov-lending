import { describe, it, expect } from 'vitest';
import { formatOrderMessage } from '../telegram';

describe('formatOrderMessage', () => {
  it('includes all order fields', () => {
    const msg = formatOrderMessage({
      orderReference: 'DROP01-9',
      fullName: 'Чемеров Олександр',
      phone: '+380671234567',
      email: 'sasha@mail.com',
      city: 'Львів',
      warehouse: 'Відділення №1',
      amount: 2200,
    });
    expect(msg).toContain('DROP01-9');
    expect(msg).toContain('Чемеров Олександр');
    expect(msg).toContain('+380671234567');
    expect(msg).toContain('sasha@mail.com');
    expect(msg).toContain('Львів');
    expect(msg).toContain('Відділення №1');
    expect(msg).toContain('2200');
  });
});
