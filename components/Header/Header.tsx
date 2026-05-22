'use client';

import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import styles from './Header.module.css';

export function Header() {
  const { open } = useCheckout();

  return (
    <header className={styles.header}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Саша Чемеров — Димна Суміш" className={styles.logo} />
      <div className={styles.right}>
        <span className={`${styles.drop} mono`}>DROP 01 // ONE SIZE (OVERSIZE)</span>
        <button className={`${styles.buy} mono`} onClick={open}>Купити</button>
      </div>
    </header>
  );
}
