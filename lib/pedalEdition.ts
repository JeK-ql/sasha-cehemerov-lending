import type { Product } from './products';

/**
 * Тексти сторінки педалі, де фігурує тираж. Замість фіксованого «10»
 * показуємо живий залишок зі складу (див. stockCount): скільки педалей
 * реально можна купити зараз.
 *
 * Фраза «серія обмежена лише 10 екземплярами» на зін-картинці — растр,
 * її figcaption дослівно повторює намальоване і тому лишається з 10.
 */

/** Українська форма слова для числа: [1, 2–4, 5+] (21 екземпляр, 22 екземпляри, 11 екземплярів). */
function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const copies = (n: number) => `${n} ${plural(n, ['екземпляр', 'екземпляри', 'екземплярів'])}`;
const pieces = (n: number) => `${n} ${plural(n, ['штука', 'штуки', 'штук'])}`;

export interface PedalEditionCopy {
  title: string;
  description: string;
  ogDescription: string;
  /** Прихований h1 сторінки. */
  heading: string;
  /** Значення рядка «Тираж» у модалці замовлення. */
  edition: string;
  /** Хвіст опису schema.org: «тираж N штук» / «тираж розпродано». */
  schemaTail: string;
}

export function pedalEditionCopy(remaining: number, price: number): PedalEditionCopy {
  const soldOut = remaining <= 0;
  const series = soldOut ? 'лімітована серія розпродана' : `лімітована серія ${copies(remaining)}`;
  return {
    title: `Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров, ${
      soldOut ? 'лімітована серія розпродана' : `лімітована серія ${remaining} шт.`
    }`,
    description: `Фузз-дисторшн «Димна Суміш» на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, ${
      soldOut ? 'тираж розпродано' : `тираж ${copies(remaining)}`
    }. ${price} ₴, доставка по Україні та за кордон.`,
    ogDescription: `${series[0].toUpperCase()}${series.slice(1)}. Ручна робота. ${price} ₴.`,
    heading: `Димна Суміш — фузз-педаль Kosko FX × Саша Чемеров, ${series}`,
    edition: soldOut ? 'Розпродано' : pieces(remaining),
    schemaTail: soldOut ? 'тираж розпродано' : `тираж ${pieces(remaining)}`,
  };
}

/** Копія товару з живим тиражем у модалці й schema.org; реєстр не мутується. */
export function withPedalEdition(product: Product, remaining: number): Product {
  const copy = pedalEditionCopy(remaining, product.price);
  return {
    ...product,
    schemaDescription: product.schemaDescription.replace(/тираж [^.]+/, copy.schemaTail),
    specs: product.specs?.map((s) => (s.label === 'Тираж' ? { ...s, value: copy.edition } : s)),
  };
}
