'use client';

import { useCheckout } from './CheckoutProvider';
import { CheckoutForm } from './CheckoutForm';
import styles from './CheckoutModal.module.css';

export function CheckoutModal() {
  const { isOpen, close } = useCheckout();
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.grab} />
        <div className={styles.scroll}>
          <div className={styles.head}>
            <span className={`${styles.title} display`}>Оформлення</span>
            <button className={styles.x} onClick={close} aria-label="Закрити">✕</button>
          </div>
          <CheckoutForm />
        </div>
      </div>
    </div>
  );
}
