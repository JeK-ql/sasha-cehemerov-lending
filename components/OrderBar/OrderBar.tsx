'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { PRODUCT } from '@/lib/config';
import styles from './OrderBar.module.css';

export function OrderBar() {
  const { open } = useCheckout();
  return (
    <button className={`${styles.cta} poster`} onClick={open}>
      Замовити — {PRODUCT.price}&nbsp;₴
    </button>
  );
}
