'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CheckoutTheme } from '@/lib/products';
import styles from './ThankYou.module.css';

type Props = {
  state: 'ok' | 'fail';
  orderRef?: string;
  homePath: string;
  /** Айдентика сторінки-хазяйки; без прапорця — чорнильна тема головної. */
  theme?: CheckoutTheme;
};

/** Скільки разів і як часто перепитуємо базу, поки колбек WayForPay летить. */
const STATUS_ATTEMPTS = 6;
const STATUS_INTERVAL_MS = 2000;

export function ThankYou({ state, orderRef, homePath, theme = 'ink' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  // Вердикт віджета/редіректу — попередній: 3DS може підтвердитись пізніше.
  // Якщо є номер замовлення — питаємо фактичний статус у нашої бази
  // (її наповнює серверний колбек WayForPay), поки чекаємо — «перевіряємо».
  const [verdict, setVerdict] = useState<'ok' | 'fail' | 'checking'>(
    orderRef ? 'checking' : state,
  );

  useEffect(() => {
    if (!orderRef) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const check = async () => {
      attempts++;
      let status = 'pending';
      try {
        const res = await fetch(`/api/order-status?ref=${orderRef}`);
        status = (await res.json())?.status ?? 'unknown';
      } catch {
        /* мережа блимнула — вважаємо pending і пробуємо ще */
      }
      if (cancelled) return;
      if (status === 'paid') return setVerdict('ok');
      if (status === 'failed') return setVerdict('fail');
      if (status === 'unknown') return setVerdict(state); // база мовчить — фолбек
      if (attempts >= STATUS_ATTEMPTS) return setVerdict(state); // колбек ще летить
      timer = setTimeout(check, STATUS_INTERVAL_MS);
    };
    check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderRef, state]);

  function close() {
    setOpen(false);
    setTimeout(() => router.replace(homePath), 240);
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

  const text: { head: string; sub: string; note?: string } =
    verdict === 'checking'
      ? { head: 'Хвилинку…', sub: 'перевіряємо оплату' }
      : verdict === 'ok'
        ? { head: 'Дякуємо', sub: 'за вашу покупку' }
        : {
            head: 'Помилка оплати',
            sub: 'спробуйте ще раз',
            // Банк інколи підтверджує оплату із затримкою (3DS) — людина
            // бачить «помилку», хоча гроші списано. Без цієї примітки вона
            // платить повторно або панікує.
            note:
              'Якщо гроші списалися з картки - не хвилюйтеся: банк іноді ' +
              'підтверджує оплату із затримкою. Щойно підтвердження дійде ' +
              'до нас, ми відправимо ваше замовлення. Повторно оплачувати ' +
              'не потрібно.',
          };

  return (
    <div
      className={styles.scrim}
      data-theme={theme}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ty-h"
    >
      <button type="button" onClick={close} className={`${styles.close} mono`}>
        ← закрити
      </button>

      <div className={styles.content}>
        <h2 id="ty-h" className={`${styles.head} display`}>
          {text.head}
        </h2>
        <p className={styles.sub}>{text.sub}</p>
        {text.note && <p className={styles.note}>{text.note}</p>}
      </div>
    </div>
  );
}
