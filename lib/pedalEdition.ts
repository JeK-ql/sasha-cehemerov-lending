import type { Product } from './products';

/**
 * Тираж серії фіксований — «10 штук» у реєстрі. Під ним у модалці замовлення
 * додаємо рядок «Залишилось» із живим залишком зі складу (див. stockCount):
 * скільки педалей реально можна купити зараз. Реєстр не мутується.
 */
export function withPedalRemaining(product: Product, remaining: number): Product {
  return {
    ...product,
    specs: product.specs?.flatMap((s) =>
      s.label === 'Тираж' ? [s, { label: 'Залишилось', value: String(remaining) }] : [s],
    ),
  };
}
