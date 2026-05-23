'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { PRODUCT } from '@/lib/config';
import type { CheckoutInput } from '@/lib/types';
import { validateCheckout } from '@/lib/validateCheckout';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';

type FieldKey = keyof CheckoutInput;

// CheckoutInput is now z.infer<typeof checkoutSchema> — requires every field
// the schema defines. Initialise them all (deliveryType locked to "warehouse"
// since v2's picker UI doesn't show the courier branch).
const EMPTY: CheckoutInput = {
  fullName: '',
  phone: '',
  email: '',
  quantity: 1,
  city: '',
  cityRef: '',
  deliveryType: 'warehouse',
  warehouse: '',
  street: '',
  building: '',
  flat: '',
};

// Upper bound for the stepper — keep in sync with the server-side clamp.
const MAX_QUANTITY = 10;

type ZoomTarget = 'front' | 'back' | null;

/**
 * Normalises any user input into the Ukrainian "+380XXXXXXXXX" form.
 *
 * Autofill triggers when typed first: "+", "3", "8", "0" — the typed char
 * is consumed into the "+380" prefix (not appended after it). Any other
 * first digit (5/6/7/9) gets the "+380" prefix prepended in front of it.
 *
 * Backspacing past the "+380" prefix clears the field so the user can
 * start fresh — disambiguated from the autofill case for "+" by comparing
 * the new value's length to the previous one.
 *
 * Caps total length at 13 chars: "+380" + 9 subscriber digits.
 */
function formatUkrainianPhone(raw: string, prev: string): string {
  if (raw === '') return '';
  if (raw.length < prev.length && raw.length < 4) return '';

  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('380'))      digits = digits.slice(3);
  else if (digits.startsWith('80'))  digits = digits.slice(2);
  else if (digits.startsWith('8'))   digits = digits.slice(1);
  else if (digits.startsWith('0'))   digits = digits.slice(1);
  else if (digits.startsWith('3'))   digits = digits.slice(1);

  digits = digits.slice(0, 9);
  return '+380' + digits;
}

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [zoomed, setZoomed] = useState<ZoomTarget>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const priceRef = useRef<HTMLSpanElement>(null);

  const markTouched = (k: FieldKey) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  // Single helper: partial-merge into data. Used by every input and by the
  // NovaPoshtaPicker's onChange contract.
  const patch = (p: Partial<CheckoutInput>) => setData((d) => ({ ...d, ...p }));

  const set = (k: 'fullName' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
    patch({ [k]: e.target.value });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((d) => ({ ...d, phone: formatUkrainianPhone(e.target.value, d.phone) }));
  };

  // Increment quantity AND pulse the price number via the Web Animations API.
  // WAAPI is explicit (no animation on mount) and automatically replaces an
  // in-flight animation if the user mashes "+".
  const handleIncrease = () => {
    setData((d) => ({ ...d, quantity: Math.min(MAX_QUANTITY, d.quantity + 1) }));
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    priceRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }],
      { duration: 320, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    );
  };

  const handleDecrease = () => {
    setData((d) => ({ ...d, quantity: Math.max(1, d.quantity - 1) }));
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

  // Display only — the authoritative amount that gets signed by the WayForPay
  // HMAC is recomputed server-side from `data.quantity`.
  const total = PRODUCT.price * data.quantity;

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
      if (!res.ok) throw new Error('checkout failed');
      const params = await res.json();
      if (!window.Wayforpay) throw new Error('widget not loaded');
      new window.Wayforpay().run(params);
    } catch {
      alert('Не вдалося почати оплату. Спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.order}>
        <button
          type="button"
          className={styles.thumbBtn}
          onClick={() => setZoomed('front')}
          aria-label="Збільшити фото — перед"
        >
          <Image src="/front.webp" alt="" fill sizes="(min-width: 768px) 220px, 33vw" className={styles.thumb} />
        </button>
        <button
          type="button"
          className={styles.thumbBtn}
          onClick={() => setZoomed('back')}
          aria-label="Збільшити фото — спина"
        >
          <Image src="/back.webp" alt="" fill sizes="(min-width: 768px) 220px, 33vw" className={styles.thumb} />
        </button>
        <div className={styles.orderInfo}>
          <div className={styles.orderName}>
            <span>too much яром</span>
            <span>too much долиною</span>
          </div>
          <div className={`${styles.orderMeta} mono`}>OVERSIZE · ОДИН РОЗМІР · ×{data.quantity}</div>
        </div>
      </div>

      <fieldset className={styles.block}>
        <Field
          label="ІМ'Я І ПРІЗВИЩЕ"
          value={data.fullName}
          onChange={set('fullName')}
          onBlur={() => markTouched('fullName')}
          autoComplete="name"
          autoCapitalize="words"
          error={visibleError('fullName')}
        />

        {/* Phone — inlined so we can attach the UA formatter, cap length,
            set autoComplete, and show the target placeholder. */}
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
            maxLength={13}
            placeholder="+380XXXXXXXXX"
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
          hint="ЧЕК СЮДИ"
        />
      </fieldset>

      <fieldset className={styles.block}>
        {/* Picker is controlled — reads city/cityRef/deliveryType/warehouse/
            street/building/flat from `data` and patches via `onChange`.
            Passing empty errors for now; once we wire Zod-based field-level
            error display, swap to a `collectErrors(data)` map. */}
        <NovaPoshtaPicker
          value={data}
          onChange={patch}
          onBlur={markTouched}
          errors={{ city: visibleError('city'), warehouse: visibleError('warehouse') }}
        />
      </fieldset>

      {/* Quantity stepper + pay button. type="button" on the steppers is
          critical — the default <button> type inside a <form> is "submit". */}
      <div className={styles.payRow}>
        <button
          type="button"
          className={styles.qtyBtn}
          aria-disabled={!valid || submitting || data.quantity <= 1}
          onClick={() => {
            if (submitting) return;
            if (!valid) { setSubmitAttempted(true); return; }
            if (data.quantity <= 1) return;
            handleDecrease();
          }}
          aria-label="Зменшити кількість"
        >
          −
        </button>
        <button
          type="submit"
          className={styles.pay}
          aria-disabled={!valid || submitting}
        >
          {submitting ? 'ЗАЧЕКАЙТЕ…' : (
            <span ref={priceRef} className={styles.payAmount}>{total} ₴ (×{data.quantity})</span>
          )}
        </button>
        <button
          type="button"
          className={styles.qtyBtn}
          aria-disabled={!valid || submitting || data.quantity >= MAX_QUANTITY}
          onClick={() => {
            if (submitting) return;
            if (!valid) { setSubmitAttempted(true); return; }
            if (data.quantity >= MAX_QUANTITY) return;
            handleIncrease();
          }}
          aria-label="Збільшити кількість"
        >
          +
        </button>
      </div>

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
