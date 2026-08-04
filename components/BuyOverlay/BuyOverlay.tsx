'use client';

import { useEffect, useState } from 'react';
import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { variantKeys } from '@/lib/products';
import styles from './BuyOverlay.module.css';

export function BuyOverlay() {
  const { open, product } = useCheckout();
  // null — наявність ще не завантажена; до відповіді кнопка активна:
  // краще пустити в чекаут (він переперевірить резервом), ніж хибно
  // показати «розпродано».
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

  return (
    <div className={styles.overlay}>
      <button
        className={styles.buy}
        onClick={open}
        disabled={soldOut}
        data-sold-out={soldOut ? 'true' : undefined}
      >
        {soldOut ? 'Розпродано' : 'Забрати'}
      </button>
    </div>
  );
}
