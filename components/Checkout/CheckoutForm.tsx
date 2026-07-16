'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { PRODUCT, SIZES, SIZE_MEASUREMENTS, type Size } from '@/lib/config';
import type { CheckoutFormState } from '@/lib/types';
import { totalQuantity } from '@/lib/checkoutSchema';
import { validateCheckout } from '@/lib/validateCheckout';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';
import { OtherDeliveryFields } from './OtherDeliveryFields';

type FieldKey = keyof CheckoutFormState;

const EMPTY: CheckoutFormState = {
  fullName: '',
  phone: '',
  email: '',
  sizes: { МАЛЕНЬКИЙ: 0, СЕРЕДНІЙ: 0, ВЕЛИКИЙ: 0 },
  deliveryMode: 'np',
  city: '',
  cityRef: '',
  deliveryType: 'warehouse',
  warehouse: '',
  country: 'Україна',
  street: '',
  building: '',
  flat: '',
  zip: '',
};

// Сумарний ліміт штук на замовлення - синхронно з superRefine схеми і серверним clamp.
const MAX_QUANTITY = 10;

// Чернетка форми в localStorage — щоб рефреш/повторне відкриття не втрачали
// введене (включно з вибором розмірів). Версія в ключі: зміниш форму полів —
// підніми версію, щоб стара несумісна чернетка не зламала гідратацію.
const DRAFT_KEY = 'isus-checkout-draft-v1';
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* приватний режим / вимкнене сховище — ігноруємо */
  }
};

type ZoomTarget = 'front' | 'back' | null;

export function CheckoutForm() {
  // Ленивий ініт із чернетки. Форма монтується лише на клієнті (модалка до
  // відкриття рендерить null), тож читати localStorage тут безпечно — SSR її
  // не рендерить, розбіжності гідратації немає.
  const [data, setData] = useState<CheckoutFormState>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null;
      if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<CheckoutFormState>) };
    } catch {
      /* пошкоджена чернетка — стартуємо з чистої форми */
    }
    return EMPTY;
  });
  const [submitting, setSubmitting] = useState(false);
  const [zoomed, setZoomed] = useState<ZoomTarget>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // null = наявність ще не завантажена (усі розміри доступні до відповіді).
  const [available, setAvailable] = useState<Record<Size, boolean> | null>(null);
  const [stockMsg, setStockMsg] = useState<string | null>(null);
  const priceRef = useRef<HTMLSpanElement>(null);

  // Наявність + чистка розпроданих розмірів (у т.ч. відновлених із чернетки).
  const applyAvailability = (avail: Record<Size, boolean>) => {
    setAvailable(avail);
    setData((d) => {
      const sizes = { ...(d.sizes as Record<Size, number>) };
      let changed = false;
      for (const s of SIZES) {
        if (!avail[s] && sizes[s] > 0) {
          sizes[s] = 0;
          changed = true;
        }
      }
      return changed ? { ...d, sizes } : d;
    });
  };

  // Товару по 20 шт. на розмір: питаємо сервер, що ще в наявності.
  // Помилка запиту не блокує форму — checkout переперевірить резервом.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/stock')
      .then((res) => (res.ok ? res.json() : null))
      .then((avail: Record<Size, boolean> | null) => {
        if (avail && !cancelled) applyAvailability(avail);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Зберігаємо чернетку на кожну зміну — рефреш/повторне відкриття її відновлять.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* сховище недоступне (приватний режим) — не критично */
    }
  }, [data]);

  const markTouched = (k: FieldKey) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  // Single helper: partial-merge into data. Used by every input and by the
  // NovaPoshtaPicker's onChange contract.
  const patch = (p: Partial<CheckoutFormState>) => setData((d) => ({ ...d, ...p }));

  const set = (k: 'fullName' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
    patch({ [k]: e.target.value });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Без автоформатування: міжнародний («+», код країни, 7–15 цифр) або
    // український 0XXXXXXXXX. Пробіли/дужки/дефіси схема нормалізує перед перевіркою.
    patch({ phone: e.target.value });
  };

  // Пульс ціни через Web Animations API - явний (без анімації на маунті),
  // повторні кліки замінюють анімацію в польоті.
  const pulsePrice = () => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    priceRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  };

  const totalCount = totalQuantity(data.sizes as Record<Size, number>);
  const canAdd = totalCount < MAX_QUANTITY;

  // Уся арифметика - всередині updater: швидкі повторні тапи не гублять
  // інкременти і не пробивають сумарний ліміт (stale-closure safe).
  const changeSize = (s: Size, delta: 1 | -1) => {
    let changed = false;
    setData((d) => {
      const sizes = d.sizes as Record<Size, number>;
      if (delta > 0 && totalQuantity(sizes) >= MAX_QUANTITY) return d;
      const next = Math.max(0, Math.min(MAX_QUANTITY, sizes[s] + delta));
      if (next === sizes[s]) return d;
      changed = true;
      return { ...d, sizes: { ...sizes, [s]: next } };
    });
    if (delta > 0 && changed) {
      markTouched('sizes');
      pulsePrice();
    }
  };

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  const errors = validateCheckout(data);
  const valid = Object.keys(errors).length === 0;
  const visibleError = (k: FieldKey): string | undefined =>
    errors[k] && (touched[k] || submitAttempted) ? errors[k] : undefined;

  // Display only - the authoritative amount that gets signed by the WayForPay
  // HMAC is recomputed server-side from the sizes record.
  const total = PRODUCT.price * totalCount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!valid) {
      setSubmitAttempted(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        // Товар розібрали, поки заповнювали форму: оновлюємо наявність,
        // чистимо розпродані розміри і даємо обрати заново.
        const body = (await res.json().catch(() => null)) as
          | { availability?: Record<Size, boolean> }
          | null;
        if (body?.availability) applyAvailability(body.availability);
        setStockMsg('На жаль, обраний розмір щойно розібрали. Оновили наявність.');
        return;
      }
      if (!res.ok) throw new Error('checkout failed');
      setStockMsg(null);
      const params = await res.json();
      if (!window.Wayforpay) throw new Error('widget not loaded');
      new window.Wayforpay().run(
        params,
        () => {
          // Оплату прийнято: чистимо чернетку і ведемо на подяку (/?paid=1).
          clearDraft();
          window.location.assign('/?paid=1');
        },
        () => {
          // Відхилено: чернетку лишаємо, щоб можна було спробувати ще раз.
          window.location.assign('/?paid=0');
        },
        () => {
          /* pending (для карток рідко) — віджет сам покаже статус */
        },
      );
    } catch {
      alert('Не вдалося почати оплату. Спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.order}>
        <div
          className={styles.thumbBtn}

        >
          <Image src="/too-much-яром-too-much-долиною.webp" alt="" fill sizes="(min-width: 768px) 220px, 33vw" className={styles.thumb} />
        </div>

        <div className={styles.orderInfo}>
          <div className={styles.orderName}>
            <span>TOO MUCH ЯРОМ TOO MUCH ДОЛИНОЮ</span>
          </div>
          <div className={`${styles.orderMeta} mono`}>
            OVERSIZE
            {SIZES.filter((s) => data.sizes[s] > 0)
              .map((s) => ` · ${s} ×${data.sizes[s]}`)
              .join('')}
          </div>
        </div>
      </div>

      <fieldset className={styles.block}>
        <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>РОЗМІР</span>
        <div className={styles.segRow} role="group" aria-label="Розмір">
          {SIZES.map((s) => {
            const soldOut = available?.[s] === false;
            return (
              <button
                key={s}
                type="button"
                className={styles.segBtn}
                data-active={data.sizes[s] > 0 ? 'true' : undefined}
                aria-pressed={data.sizes[s] > 0}
                disabled={soldOut}
                onClick={() => changeSize(s, 1)}
              >
                {s}
                {soldOut ? (
                  <span className={styles.soldOut}>РОЗПРОДАНО</span>
                ) : (
                  data.sizes[s] > 0 ? ` ×${data.sizes[s]}` : ''
                )}
              </button>
            );
          })}
        </div>
        {stockMsg && <span className={`${styles.fieldError} mono`}>{stockMsg}</span>}
        {SIZES.filter((s) => data.sizes[s] > 0).map((s) => (
          <div key={s}>
            <div className={styles.sizeQtyRow}>
              <span className={`${styles.sizeQtyLabel} mono`}>{s}</span>
              <button
                type="button"
                className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
                onClick={() => changeSize(s, -1)}
                aria-label={`Менше: ${s}`}
              >
                −
              </button>
              <span className={`${styles.sizeQtyCount} mono`}>{data.sizes[s]}</span>
              <button
                type="button"
                className={`${styles.qtyBtn} ${styles.qtyBtnSmall}`}
                aria-disabled={!canAdd}
                onClick={() => changeSize(s, 1)}
                aria-label={`Більше: ${s}`}
              >
                +
              </button>
            </div>
            {SIZE_MEASUREMENTS[s] && (
              <span className={`${styles.fieldHint} mono`}>
                ШИРИНА {SIZE_MEASUREMENTS[s]!.widthCm} СМ · ДОВЖИНА{' '}
                {SIZE_MEASUREMENTS[s]!.lengthCm} СМ
              </span>
            )}
          </div>
        ))}
        {visibleError('sizes') && (
          <span className={`${styles.fieldError} mono`}>{visibleError('sizes')}</span>
        )}
      </fieldset>

      <fieldset className={styles.block}>
        <Field
          label="ІМ'Я І ПРІЗВИЩЕ"
          value={data.fullName}
          onChange={set('fullName')}
          onBlur={() => markTouched('fullName')}
          autoComplete="name"
          autoCapitalize="words"
          error={visibleError('fullName')}
          hint={data.deliveryMode === 'other' ? 'для закордону - латиницею, як у паспорті' : undefined}
        />

        {/* Phone - inlined to cap length, set autoComplete and show the
            international placeholder; validation lives in checkoutSchema. */}
        <label className={styles.field}>
          <span className={`${styles.fieldLabel} mono`}>Телефон</span>
          <input
            className={styles.input}
            data-invalid={visibleError('phone') ? 'true' : undefined}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={data.phone}
            onChange={handlePhoneChange}
            onBlur={() => markTouched('phone')}
            maxLength={20}
            placeholder="ваш номер"
          />
          {visibleError('phone') && (
            <span className={`${styles.fieldError} mono`}>{visibleError('phone')}</span>
          )}
        </label>

        <Field
          label="ЕМЕЙЛ"
          value={data.email}
          onChange={set('email')}
          onBlur={() => markTouched('email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          error={visibleError('email')}
        />
      </fieldset>

      <fieldset className={styles.block}>
        <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>ДОСТАВКА</span>
        <div className={styles.segRow} role="radiogroup" aria-label="Спосіб доставки">
          <button
            type="button"
            className={styles.segBtn}
            data-active={data.deliveryMode === 'np' ? 'true' : undefined}
            aria-pressed={data.deliveryMode === 'np'}
            onClick={() => patch({ deliveryMode: 'np' })}
          >
            НОВА ПОШТА
          </button>
          <button
            type="button"
            className={styles.segBtn}
            data-active={data.deliveryMode === 'other' ? 'true' : undefined}
            aria-pressed={data.deliveryMode === 'other'}
            onClick={() => patch({ deliveryMode: 'other' })}
          >
            ІНШЕ
          </button>
        </div>
        <span className={`${styles.fieldHint} mono`}>
          Інше - Укрпошта: по Україні та за кордон
        </span>
        {data.deliveryMode === 'np' ? (
          <NovaPoshtaPicker
            value={data}
            onChange={patch}
            onBlur={markTouched}
            errors={{ city: visibleError('city'), warehouse: visibleError('warehouse') }}
          />
        ) : (
          <OtherDeliveryFields
            value={data}
            onChange={patch}
            onBlur={markTouched}
            errors={{
              country: visibleError('country'),
              city: visibleError('city'),
              street: visibleError('street'),
              building: visibleError('building'),
              zip: visibleError('zip'),
            }}
          />
        )}
      </fieldset>

      <div className={styles.payRow}>
        <button
          type="submit"
          className={styles.pay}
          aria-disabled={!valid || submitting}
        >
          {submitting ? 'ЗАЧЕКАЙТЕ…' : (
            <span ref={priceRef} className={styles.payAmount}>
              {total} ₴ (×{totalCount})
            </span>
          )}
        </button>
      </div>

      <p className={`${styles.deliveryNote} mono`}>
        Доставка - за рахунок отримувача, за тарифами перевізника
      </p>

      {zoomed && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.zoomBackdrop}
          onClick={() => setZoomed(null)}
          role="dialog"
          aria-label="Збільшене фото"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomed === 'front' ? '/front.webp' : '/back.webp'}
            alt={PRODUCT.name}
            className={styles.zoomImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  type?: string;
  inputMode?: 'tel' | 'email' | 'text';
  autoComplete?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  spellCheck?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={`${styles.fieldLabel} mono`}>{props.label}</span>
      <input
        className={styles.input}
        data-invalid={props.error ? 'true' : undefined}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        autoCapitalize={props.autoCapitalize}
        spellCheck={props.spellCheck}
        value={props.value}
        onChange={props.onChange}
        onBlur={props.onBlur}
      />
      {props.error
        ? <span className={`${styles.fieldError} mono`}>{props.error}</span>
        : props.hint && <span className={`${styles.fieldHint} mono`}>{props.hint}</span>}
    </label>
  );
}
