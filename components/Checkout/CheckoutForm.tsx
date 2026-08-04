'use client';

import { useState, useEffect, useRef } from 'react';
import type { Product } from '@/lib/products';
import { variantKeys } from '@/lib/products';
import type { CheckoutFormState } from '@/lib/types';
import { totalQuantity, emptySizes } from '@/lib/checkoutSchema';
import { validateCheckout } from '@/lib/validateCheckout';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';
import { OtherDeliveryFields } from './OtherDeliveryFields';
import { ProductSummary } from './ProductSummary';
import { VariantPicker } from './VariantPicker';

type FieldKey = keyof CheckoutFormState;

// Чернетка розводиться по товарах: інакше форма педалі підхопить розміри
// футболки. Версія v2 — структура форми змінилась, старі чернетки несумісні.
const draftKey = (productId: string) => `isus-checkout-draft-v2:${productId}`;

const emptyForm = (product: Product): CheckoutFormState => ({
  productId: product.id,
  sizes: emptySizes(product),
  fullName: '',
  phone: '',
  email: '',
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
});

export function CheckoutForm({ product }: { product: Product }) {
  // Ленивий ініт із чернетки. Форма монтується лише на клієнті (модалка до
  // відкриття рендерить null), тож читати localStorage тут безпечно — SSR її
  // не рендерить, розбіжності гідратації немає.
  const [data, setData] = useState<CheckoutFormState>(() => {
    try {
      const raw =
        typeof window !== 'undefined' ? localStorage.getItem(draftKey(product.id)) : null;
      if (raw) {
        return {
          ...emptyForm(product),
          ...(JSON.parse(raw) as Partial<CheckoutFormState>),
          productId: product.id,
          // Одноваріантний товар (немає VariantPicker, кількість підняти
          // нема як): якщо draft.sizes зберіг {STANDARD: 0} (бо на момент
          // збереження товару не було в наявності), покупця назавжди
          // заблокує «Товар недоступний» навіть після рефанду чи
          // прострочки чужого резерву. Кількість такого товару завжди
          // рахується заново з emptySizes, чернетка тут не джерело правди.
          // Розпроданість і далі показує BuyOverlay/applyAvailability —
          // через `available`, а не через сховану в чернетці кількість.
          ...(!product.showVariantPicker ? { sizes: emptySizes(product) } : {}),
        };
      }
    } catch {
      /* пошкоджена чернетка — стартуємо з чистої форми */
    }
    return emptyForm(product);
  });
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // null = наявність ще не завантажена (усі розміри доступні до відповіді).
  const [available, setAvailable] = useState<Record<string, boolean> | null>(null);
  const [stockMsg, setStockMsg] = useState<string | null>(null);
  const priceRef = useRef<HTMLSpanElement>(null);

  // Наявність + чистка розпроданих розмірів (у т.ч. відновлених із чернетки).
  const applyAvailability = (avail: Record<string, boolean>) => {
    setAvailable(avail);
    setData((d) => {
      const sizes = { ...d.sizes };
      let changed = false;
      for (const k of variantKeys(product)) {
        if (!avail[k] && (sizes[k] ?? 0) > 0) {
          sizes[k] = 0;
          changed = true;
        }
      }
      return changed ? { ...d, sizes } : d;
    });
  };

  // Товару обмежена кількість: питаємо сервер, що ще в наявності.
  // Помилка запиту не блокує форму — checkout переперевірить резервом.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stock?product=${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((avail: Record<string, boolean> | null) => {
        if (avail && !cancelled) applyAvailability(avail);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyAvailability лише читає product.id (уже в deps) і сталі setState-функції; додавання самої функції ганяло б запит на кожен рендер
  }, [product.id]);

  // Зберігаємо чернетку на кожну зміну — рефреш/повторне відкриття її відновлять.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(product.id), JSON.stringify(data));
    } catch {
      /* сховище недоступне (приватний режим) — не критично */
    }
  }, [data, product.id]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey(product.id));
    } catch {
      /* приватний режим / вимкнене сховище — ігноруємо */
    }
  };

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

  // Уся арифметика - всередині updater: швидкі повторні тапи не гублять
  // інкременти і не пробивають сумарний ліміт (stale-closure safe).
  const changeSize = (key: string, delta: 1 | -1) => {
    let changed = false;
    setData((d) => {
      if (delta > 0 && totalQuantity(d.sizes) >= product.maxPerOrder) return d;
      const current = d.sizes[key] ?? 0;
      const next = Math.max(0, Math.min(product.maxPerOrder, current + delta));
      if (next === current) return d;
      changed = true;
      return { ...d, sizes: { ...d.sizes, [key]: next } };
    });
    if (delta > 0 && changed) {
      markTouched('sizes');
      pulsePrice();
    }
  };

  const errors = validateCheckout(data);
  const valid = Object.keys(errors).length === 0;
  const visibleError = (k: FieldKey): string | undefined =>
    errors[k] && (touched[k] || submitAttempted) ? errors[k] : undefined;

  const totalCount = totalQuantity(data.sizes);
  // Display only - the authoritative amount that gets signed by the WayForPay
  // HMAC is recomputed server-side from the sizes record.
  const total = product.price * totalCount;

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
          | { availability?: Record<string, boolean> }
          | null;
        if (body?.availability) applyAvailability(body.availability);
        setStockMsg(
          product.showVariantPicker
            ? 'На жаль, обраний розмір щойно розібрали. Оновили наявність.'
            : 'На жаль, товар щойно розібрали. Оновили наявність.',
        );
        return;
      }
      if (!res.ok) throw new Error('checkout failed');
      setStockMsg(null);
      const params = await res.json();
      if (!window.Wayforpay) throw new Error('widget not loaded');
      // ref у редіректі: сторінка подяки перепитає фактичний статус у базі
      // (вердикт віджета — попередній, 3DS може підтвердитись пізніше).
      const ref = `&ref=${params.orderReference}`;
      new window.Wayforpay().run(
        params,
        () => {
          // Оплату прийнято: чистимо чернетку і ведемо на подяку.
          clearDraft();
          window.location.assign(`${product.path}?paid=1${ref}`);
        },
        () => {
          // Відхилено: чернетку лишаємо, щоб можна було спробувати ще раз.
          window.location.assign(`${product.path}?paid=0${ref}`);
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
      <ProductSummary product={product} sizes={data.sizes} />

      {product.showVariantPicker && (
        <VariantPicker
          product={product}
          sizes={data.sizes}
          available={available}
          stockMsg={stockMsg}
          error={visibleError('sizes')}
          onChange={changeSize}
        />
      )}
      {!product.showVariantPicker && stockMsg && (
        <span className={`${styles.fieldError} mono`}>{stockMsg}</span>
      )}

      <fieldset className={`${styles.block} ${styles.blockContact}`}>
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

      <fieldset className={`${styles.block} ${styles.blockDelivery}`}>
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
              {total} ₴{product.showVariantPicker ? ` (×${totalCount})` : ''}
            </span>
          )}
        </button>
      </div>

      <p className={`${styles.deliveryNote} mono`}>
        Доставка - за рахунок отримувача, за тарифами перевізника
      </p>
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
