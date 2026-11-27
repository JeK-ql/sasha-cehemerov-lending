import { describe, it, expect } from 'vitest';
import { pedalEditionCopy, withPedalEdition } from '../pedalEdition';
import { PRODUCTS } from '../products';

describe('pedalEditionCopy', () => {
  it('підставляє залишок у всі тексти', () => {
    const c = pedalEditionCopy(7, 13000);
    expect(c.title).toBe(
      'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 7 шт.',
    );
    expect(c.description).toBe(
      'Фузз-дисторшн «Димна Суміш» на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 7 екземплярів. 13000 ₴, доставка по Україні та за кордон.',
    );
    expect(c.ogDescription).toBe('Лімітована серія 7 екземплярів. Ручна робота. 13000 ₴.');
    expect(c.heading).toBe(
      'Димна Суміш — фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 7 екземплярів',
    );
    expect(c.edition).toBe('7 штук');
  });

  it('ціна в описах — та, що передана (акційна теж)', () => {
    const c = pedalEditionCopy(7, 8500);
    expect(c.description).toContain('тираж 7 екземплярів. 8500 ₴, доставка');
    expect(c.ogDescription).toBe('Лімітована серія 7 екземплярів. Ручна робота. 8500 ₴.');
  });

  it('узгоджує відмінки з числом', () => {
    expect(pedalEditionCopy(1, 13000).edition).toBe('1 штука');
    expect(pedalEditionCopy(3, 13000).edition).toBe('3 штуки');
    expect(pedalEditionCopy(11, 13000).edition).toBe('11 штук');
    expect(pedalEditionCopy(22, 13000).ogDescription).toBe(
      'Лімітована серія 22 екземпляри. Ручна робота. 13000 ₴.',
    );
    expect(pedalEditionCopy(21, 13000).ogDescription).toBe(
      'Лімітована серія 21 екземпляр. Ручна робота. 13000 ₴.',
    );
  });

  it('нуль — «розпродано» замість «0 штук»', () => {
    const c = pedalEditionCopy(0, 13000);
    expect(c.edition).toBe('Розпродано');
    expect(c.title).toBe(
      'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров, лімітована серія розпродана',
    );
    expect(c.ogDescription).toBe('Лімітована серія розпродана. Ручна робота. 13000 ₴.');
  });
});

describe('withPedalEdition', () => {
  it('міняє рядок «Тираж» і опис schema.org, решту не чіпає', () => {
    const p = withPedalEdition(PRODUCTS.PEDAL01, 4);
    expect(p.specs?.find((s) => s.label === 'Тираж')?.value).toBe('4 штуки');
    expect(p.schemaDescription).toBe(
      'Фузз-дисторшн "Димна Суміш" — лімітована колаборація Kosko FX × Саша Чемеров на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 4 штуки.',
    );
    expect(p.specs?.find((s) => s.label === 'Корпус')?.value).toBe('Алюміній (формат 1590B)');
    expect(p.id).toBe('PEDAL01');
    // Реєстр не мутується.
    expect(PRODUCTS.PEDAL01.specs?.find((s) => s.label === 'Тираж')?.value).toBe('10 штук');
  });
});
