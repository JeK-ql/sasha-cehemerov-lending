'use client';

import { useEffect, useRef, useState } from 'react';
import { useCheckout } from '@/components/Checkout/CheckoutProvider';
import { useSoldOut } from '@/components/Checkout/useSoldOut';
import styles from './PedalBuy.module.css';

/**
 * Кнопка купівлі на сторінці педалі.
 *
 * Дві копії однієї кнопки:
 *  1. основна — у потоці під третім блоком зіна (на головній кнопка лежить
 *     поверх відео, тут макет закінчується малюнком педалі, а не медіа);
 *  2. липка панель знизу — стоїть від першого екрана і ховається рівно тоді,
 *     коли у в'юпорт входить основна кнопка, щоб внизу не стояли дві
 *     однакові кнопки поруч.
 *
 * Панель видима вже в SSR-розмітці (початковий стан «основну кнопку не
 * видно»), тому на завантаженні вона не блимає.
 */
export function PedalBuy() {
  const { open, product } = useCheckout();
  const soldOut = useSoldOut(product);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchorSeen, setAnchorSeen] = useState(false);

  // Основна кнопка у в'юпорті — липку ховаємо.
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setAnchorSeen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Розпродано — липка панель зникає зовсім. Постійна плашка «Розпродано»
  // над контентом нічого не додає, тільки з'їдає екран.
  const showSticky = !anchorSeen && !soldOut;
  const label = soldOut ? 'Розпродано' : 'Забрати';

  return (
    <>
      <div className={styles.wrap} ref={anchorRef}>
        <button
          className={styles.buy}
          onClick={open}
          disabled={soldOut}
          data-sold-out={soldOut ? 'true' : undefined}
        >
          {label}
        </button>
      </div>
      <div
        className={styles.sticky}
        data-visible={showSticky ? 'true' : undefined}
        // inert прибирає приховану копію з таб-порядку й з озвучки, щоб
        // скрінрідер не читав «Забрати» двічі.
        inert={!showSticky}
      >
        <button className={`${styles.buy} ${styles.stickyBuy}`} onClick={open}>
          {label}
        </button>
      </div>
    </>
  );
}
