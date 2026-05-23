'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import styles from './BuyOverlay.module.css';

export function BuyOverlay() {
  const { open } = useCheckout();
  return (
    <div className={styles.overlay}>
      <button className={styles.buy} onClick={open}>
        Забрати
      </button>
    </div>
  );
}
