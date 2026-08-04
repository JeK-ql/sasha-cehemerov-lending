'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import styles from './PedalSticker.module.css';

/**
 * Стікер-тизер «тут сюрприз» — приклеєне до екрана (fixed) посилання на
 * сторінку педалі. Текст запечений у картинку, тому імʼя лінка несе
 * aria-label: інтригу зберігає, але скрінрідеру каже, що це перехід на
 * окрему сторінку.
 *
 * Коли футер заїжджає у вʼюпорт, стікер ховається (fade + inert), щоб не
 * закривати соцмережі й платіжні марки — вони в футері теж праворуч.
 */
export function PedalSticker() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    const footer = document.querySelector('footer');
    if (!el || !footer) return;
    const io = new IntersectionObserver(([entry]) => {
      el.classList.toggle(styles.hidden, entry.isIntersecting);
      // inert прибирає схований лінк і з tab-порядку, і з кліків.
      el.inert = entry.isIntersecting;
    });
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href="/pedal"
      className={styles.sticker}
      aria-label="Тут сюрприз — секретна сторінка дропу"
      // Вмикає перехід «зін-флаєр» — /pedal заїжджає знизу (див. globals.css).
      transitionTypes={['pedal-open']}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/link-pedal.webp"
        alt=""
        width={260}
        height={243}
        decoding="async"
        className={styles.image}
      />
    </Link>
  );
}
