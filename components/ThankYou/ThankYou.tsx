'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ThankYou.module.css';

type Props = { state: 'ok' | 'fail' };

export function ThankYou({ state }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function close() {
    setOpen(false);
    setTimeout(() => router.replace('/'), 240);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close is a new function every render; only wire the listener once on mount
  }, []);

  if (!open) return null;

  const ok = state === 'ok';

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-labelledby="ty-h">
      <button type="button" onClick={close} className={`${styles.close} mono`}>
        ← закрити
      </button>

      <div className={styles.content}>
        <h2 id="ty-h" className={`${styles.head} display`}>
          {ok ? 'Дякуємо' : 'Помилка оплати'}
        </h2>
        <p className={styles.sub}>
          {ok ? 'за вашу покупку' : 'спробуйте ще раз'}
        </p>
      </div>
    </div>
  );
}
