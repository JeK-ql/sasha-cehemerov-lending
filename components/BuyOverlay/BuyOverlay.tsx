'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { useSoldOut } from '@/components/Checkout/useSoldOut';
import styles from './BuyOverlay.module.css';

export function BuyOverlay() {
  const { open, product } = useCheckout();
  const soldOut = useSoldOut(product);

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
