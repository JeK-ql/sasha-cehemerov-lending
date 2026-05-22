'use client';

import { useEffect } from 'react';
import { useCheckout } from './CheckoutProvider';
import { CheckoutForm } from './CheckoutForm';
import styles from './CheckoutModal.module.css';

export function CheckoutModal() {
  const { isOpen, close } = useCheckout();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={close}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.grab} />
        <div className={styles.scroll}>
          <div className={styles.head}>
            <span className={`${styles.title} display`}>ЗАМОВЛЕННЯ</span>
            <button className={styles.x} onClick={close} aria-label="Закрити">✕</button>
          </div>
          <CheckoutForm />
        </div>
      </div>
    </div>
  );
}
