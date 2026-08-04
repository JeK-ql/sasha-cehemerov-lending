'use client'; // межа помилок може бути тільки клієнтським компонентом

import { useEffect } from 'react';
import styles from './error.module.css';

/**
 * Ловить неспіймані помилки рендера сторінок і клієнтських компонентів
 * (сторінки товарів, чекаут) і показує екран із повтором замість дефолтного
 * «Application error» від Next.
 *
 * Проп повтору тут `unstable_retry`, а не звичний `reset`: у Next 16.2 саме
 * він перефетчує й перерендерює вміст межі, і документація радить його за
 * замовчуванням (`reset` лише чистить стан без перезапиту). Див.
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
 *
 * Свідомо без Header/Footer і без даних товару: що менше залежностей у
 * фолбеку, то менше шансів, що зламається і він.
 *
 * Помилки в самому кореневому layout ця межа НЕ ловить — для них потрібен
 * окремий global-error.tsx.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // У проді текст серверної помилки на клієнт не приїжджає — у логах
    // Vercel її знаходять за digest, тому логуємо саме його.
    console.error('Page error', error.digest, error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <p className={`${styles.kicker} mono`}>Помилка</p>
        <h1 className={`${styles.headline} poster`}>Сторінка не завантажилась</h1>
        <p className={styles.support}>
          Зазвичай це тимчасово. Натисніть «спробувати ще раз» - сторінка
          перезавантажиться.
        </p>

        <button type="button" className={styles.cta} onClick={() => unstable_retry()}>
          Спробувати ще раз
        </button>

        {error.digest && (
          <p className={`${styles.digest} mono`}>код помилки: {error.digest}</p>
        )}
      </section>
    </main>
  );
}
