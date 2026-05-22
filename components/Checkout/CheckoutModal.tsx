'use client';

import { useEffect, useState } from 'react';
import { useCheckout } from './CheckoutProvider';
import { CheckoutForm } from './CheckoutForm';
import styles from './CheckoutModal.module.css';

export function CheckoutModal() {
  const { isOpen, close } = useCheckout();
  const [mounted, setMounted] = useState(false); // present in the DOM?
  const [shown, setShown] = useState(false); // animated-in state

  // Mount on open; keep the element mounted through the exit transition.
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 360);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Flip the visible state AFTER the closed state has been painted.
  // This effect runs post-paint (passive effect), so the panel is already
  // on-screen in its closed position — one frame later we flip to `shown`
  // and the CSS transition runs. Doing this in the same effect as the mount
  // is unreliable: the closed frame may never be painted.
  useEffect(() => {
    if (mounted && isOpen) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
  }, [mounted, isOpen]);

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
