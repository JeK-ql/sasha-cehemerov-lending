'use client';

import { useEffect, useState } from 'react';
import { useCheckout } from './CheckoutProvider';
import { CheckoutForm } from './CheckoutForm';
import styles from './CheckoutModal.module.css';

export function CheckoutModal() {
  const { isOpen, close } = useCheckout();
  const [mounted, setMounted] = useState(false); // present in the DOM?
  const [shown, setShown] = useState(false); // animated-in state

  // Mount immediately on open; on close, play the exit transition, then unmount.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Two frames so the browser paints the closed state before we flip to
      // shown — otherwise the enter transition is skipped.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 340);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  if (!mounted) return null;

  return (
    <div className={styles.overlay} data-shown={shown} onClick={close}>
      <div
        className={styles.panel}
        data-shown={shown}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
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
