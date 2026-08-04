'use client';

import { useEffect, useState } from 'react';
import { variantKeys, type Product } from '@/lib/products';

/**
 * Чи розпродані всі варіанти товару.
 *
 * Старт з false: наявність ще не завантажена, тому до відповіді /api/stock
 * кнопка лишається активною. Хибне «розпродано» коштує продажу, а чекаут
 * однаково перевірить наявність реальним резервом.
 *
 * Логіка живе окремо від кнопки, бо кнопок дві й виглядають вони по-різному
 * (BuyOverlay на головній, PedalBuy на /pedal), а правило наявності одне.
 */
export function useSoldOut(product: Product): boolean {
  const [soldOut, setSoldOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock?product=${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((avail: Record<string, boolean> | null) => {
        if (!avail || cancelled) return;
        setSoldOut(variantKeys(product).every((k) => avail[k] === false));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product]);

  return soldOut;
}
