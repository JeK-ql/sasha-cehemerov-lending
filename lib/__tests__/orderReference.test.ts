import { describe, it, expect } from 'vitest';
import {
  newOrderReference,
  ORDER_REF_RE,
  productIdFromRef,
  suffixFromBytes,
} from '../orderReference';

describe('newOrderReference', () => {
  it('має формат <PRODUCT_ID>-<timestamp><суфікс> і проходить ORDER_REF_RE', () => {
    const ref = newOrderReference('PEDAL01', 1754200000000);
    expect(ref.startsWith('PEDAL01-1754200000000')).toBe(true);
    expect(ref).toMatch(ORDER_REF_RE);
  });

  it('суфікс — рівно 4 символи [0-9a-z]', () => {
    const suffix = newOrderReference('DROP01', 1754200000000).slice('DROP01-1754200000000'.length);
    expect(suffix).toMatch(/^[0-9a-z]{4}$/);
  });
});

describe('suffixFromBytes', () => {
  // Детерміновані вектори замість "N розіграшів без колізій": "N спроб
  // унікальні" — це властивість crypto.randomBytes і birthday bound, а не
  // цього коду, і жоден розмір вибірки не робить її детермінованою (лише
  // міняє частоту флейків). Те, що дійсно належить цьому коду, — мапінг
  // байт → символ алфавіту, тож пінимо саме його на конкретних байтах.
  it('байт 0 і байт 35 — краї алфавіту', () => {
    expect(suffixFromBytes(Buffer.from([0, 35, 0, 35]))).toBe('0z0z');
  });

  it('байти понад довжину алфавіту загортаються по модулю 36', () => {
    // 36 % 36 = 0 → '0'; 37 % 36 = 1 → '1'; 255 % 36 = 3 → '3'; 100 % 36 = 28 → 's'.
    expect(suffixFromBytes(Buffer.from([36, 37, 255, 100]))).toBe('013s');
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
