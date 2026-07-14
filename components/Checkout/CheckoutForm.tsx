'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { PRODUCT, SIZES, SIZE_MEASUREMENTS } from '@/lib/config';
import type { CheckoutFormState } from '@/lib/types';
import { validateCheckout } from '@/lib/validateCheckout';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';
import { OtherDeliveryFields } from './OtherDeliveryFields';

type FieldKey = keyof CheckoutFormState;

const EMPTY: CheckoutFormState = {
  fullName: '',
  phone: '',
  email: '',
  quantity: 1,
  size: '',
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

// Upper bound for the stepper — keep in sync with the server-side clamp.
const MAX_QUANTITY = 10;

type ZoomTarget = 'front' | 'back' | null;

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutFormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [zoomed, setZoomed] = useState<ZoomTarget>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const priceRef = useRef<HTMLSpanElement>(null);

  const markTouched = (k: FieldKey) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  // Single helper: partial-merge into data. Used by every input and by the
  // NovaPoshtaPicker's onChange contract.
  const patch = (p: Partial<CheckoutFormState>) => setData((d) => ({ ...d, ...p }));

  const set = (k: 'fullName' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
    patch({ [k]: e.target.value });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Міжнародний формат без автоформатування: «+», код країни, 7–15 цифр.
    // Пробіли/дужки/дефіси дозволені — схема нормалізує їх перед перевіркою.
    patch({ phone: e.target.value });
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
        <div
          className={styles.thumbBtn}

        >
          <Image src="/too-much-яром-too-much-долиною.jpg" alt="" fill sizes="(min-width: 768px) 220px, 33vw" className={styles.thumb} />
        </div>

        <div className={styles.orderInfo}>
          <div className={styles.orderName}>
            <span>TOO MUCH ЯРОМ TOO MUCH ДОЛИНОЮ</span>
          </div>
          <div className={`${styles.orderMeta} mono`}>
            OVERSIZE{data.size ? ` · ${data.size}` : ''} · ×{data.quantity}
          </div>
        </div>
      </div>

      <fieldset className={styles.block}>
        <span className={`${styles.fieldLabel} ${styles.segLabel} mono`}>РОЗМІР</span>
        <div className={styles.segRow} role="radiogroup" aria-label="Розмір">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.segBtn}
              data-active={data.size === s ? 'true' : undefined}
              aria-pressed={data.size === s}
              onClick={() => {
                patch({ size: s });
                markTouched('size');
              }}
            >
              {s}
            </button>
          ))}
        </div>
        {visibleError('size') ? (
          <span className={`${styles.fieldError} mono`}>{visibleError('size')}</span>
        ) : (
          data.size &&
          SIZE_MEASUREMENTS[data.size] && (
            <span className={`${styles.fieldHint} mono`}>
              ШИРИНА {SIZE_MEASUREMENTS[data.size]!.widthCm} СМ · ДОВЖИНА{' '}
              {SIZE_MEASUREMENTS[data.size]!.lengthCm} СМ
            </span>
          )
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
          hint={data.deliveryMode === 'other' ? 'для закордону — латиницею, як у паспорті' : undefined}
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
            maxLength={20}
            placeholder="+380 …"
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
          Інше — Укрпошта: по Україні та за кордон
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

      <p className={`${styles.deliveryNote} mono`}>
        Доставка — за рахунок отримувача, за тарифами перевізника
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
