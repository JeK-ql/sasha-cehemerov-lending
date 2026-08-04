import { describe, it, expect } from 'vitest';
import { newOrderReference, ORDER_REF_RE, productIdFromRef } from '../orderReference';

describe('newOrderReference', () => {
  it('має формат <PRODUCT_ID>-<timestamp><суфікс> і проходить ORDER_REF_RE', () => {
    const ref = newOrderReference('PEDAL01', 1754200000000);
    expect(ref.startsWith('PEDAL01-1754200000000')).toBe(true);
    expect(ref).toMatch(ORDER_REF_RE);
  });

  it('сто номерів в одну мілісекунду — жодної колізії', () => {
    // 100, не 1000: суфікс — 4 символи з алфавіту 36, тобто простір лише
    // 36^4 ≈ 1.68M варіантів. При 1000 розіграшах у той самий проміжок
    // параграф народження (birthday paradox) дає ~26% шанс колізії —
    // тест був би нестабільним у CI. 100 розіграшів лишає ризик ~0.3%,
    // достатньо низьким, і досі ловить зламаний (нерандомний) генератор.
    const refs = new Set(
      Array.from({ length: 100 }, () => newOrderReference('PEDAL01', 1754200000000)),
    );
    expect(refs.size).toBe(100);
  });

  it('суфікс — рівно 4 символи [0-9a-z]', () => {
    const suffix = newOrderReference('DROP01', 1754200000000).slice('DROP01-1754200000000'.length);
    expect(suffix).toMatch(/^[0-9a-z]{4}$/);
  });
});

describe('ORDER_REF_RE', () => {
  it('приймає старі суто-цифрові номери (зворотна сумісність)', () => {
    expect('DROP01-1752600000000').toMatch(ORDER_REF_RE);
  });

  it('приймає обидва товари', () => {
    expect('PEDAL01-1754200000000ab3z').toMatch(ORDER_REF_RE);
    expect('DROP01-1754200000000ab3z').toMatch(ORDER_REF_RE);
  });

  it('відхиляє чужі й підозрілі значення', () => {
    for (const bad of [
      'OTHER-1754200000000',
      'DROP01-123',
      'DROP01-1754200000000ABZZ',
      'DROP01-1754200000000; DROP TABLE',
      '../DROP01-1754200000000',
      '',
    ]) {
      expect(bad).not.toMatch(ORDER_REF_RE);
    }
  });
});

describe('productIdFromRef', () => {
  it('дістає товар із номера замовлення', () => {
    expect(productIdFromRef('PEDAL01-1754200000000ab3z')).toBe('PEDAL01');
    expect(productIdFromRef('DROP01-1752600000000')).toBe('DROP01');
  });

  it('повертає null на невалідному номері', () => {
    expect(productIdFromRef('OTHER-1754200000000')).toBeNull();
    expect(productIdFromRef('сміття')).toBeNull();
  });
});
