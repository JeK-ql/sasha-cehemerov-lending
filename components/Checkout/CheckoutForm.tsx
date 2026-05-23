'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRODUCT } from '@/lib/config';
import { checkoutSchema } from '@/lib/checkoutSchema';
import type { CheckoutInput } from '@/lib/types';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';
import { QuantityStepper } from './QuantityStepper';
import { OrderSuccess } from './OrderSuccess';

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

type Errors = Partial<Record<keyof CheckoutInput, string>>;

/** Перша помилка по кожному полю з результату Zod-розбору. */
function collectErrors(data: CheckoutInput): Errors {
  const res = checkoutSchema.safeParse(data);
  if (res.success) return {};
  const errs: Errors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof CheckoutInput;
    if (key && !errs[key]) errs[key] = issue.message;
  }
  return errs;
}

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [tried, setTried] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  const errors = tried ? collectErrors(data) : {};

  const patch = (p: Partial<CheckoutInput>) => setData((d) => ({ ...d, ...p }));
  const setField =
    (k: 'fullName' | 'phone' | 'email') => (e: React.ChangeEvent<HTMLInputElement>) =>
      patch({ [k]: e.target.value });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setTried(true);
    if (!checkoutSchema.safeParse(data).success) return;
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
      setPlaced(String(params.orderReference));
      new window.Wayforpay().run(params);
    } catch {
      alert('Не вдалося оформити замовлення. Спробуйте ще раз.');
      setSubmitting(false);
    }
  }

  if (placed) return <OrderSuccess orderReference={placed} />;

  const total = PRODUCT.price * data.quantity;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.order}>
        <Image src="/front.webp" alt="" width={54} height={54} className={styles.thumb} />
        <div className={styles.orderInfo}>
          <div className={styles.orderName}>{PRODUCT.name}</div>
          <div className={`${styles.orderMeta} mono`}>OVERSIZE · ОДИН РОЗМІР</div>
          <QuantityStepper value={data.quantity} onChange={(q) => patch({ quantity: q })} />
        </div>
        <div className={`${styles.orderPrice} poster`}>{total}&nbsp;₴</div>
      </div>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>01 — Хто ти</legend>
        <Field
          label="Прізвище та імʼя"
          placeholder="Чемеров Олександр"
          value={data.fullName}
          onChange={setField('fullName')}
          error={errors.fullName}
        />
        <Field
          label="Телефон"
          placeholder="+380 67 123 45 67"
          value={data.phone}
          onChange={setField('phone')}
          type="tel"
          inputMode="tel"
          error={errors.phone}
        />
        <Field
          label="E-mail"
          placeholder="you@example.com"
          value={data.email}
          onChange={setField('email')}
          type="email"
          inputMode="email"
          error={errors.email}
        />
      </fieldset>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>02 — Куди везти</legend>
        <NovaPoshtaPicker value={data} onChange={patch} errors={errors} />
      </fieldset>

      <button type="submit" className={styles.pay} disabled={submitting}>
        {submitting ? 'ЗАЧЕКАЙТЕ…' : 'ЗАМОВИТИ'}
        <span className={`${styles.payWp} mono`}>Оплатити</span>
      </button>
    </form>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  inputMode?: 'tel' | 'email' | 'text';
  placeholder?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={`${styles.fieldLabel} mono`}>{props.label}</span>
      <input
        className={styles.input}
        data-invalid={props.error ? 'true' : undefined}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
      />
      {props.error ? (
        <span className={`${styles.fieldError} mono`}>{props.error}</span>
      ) : (
        props.hint && <span className={`${styles.fieldHint} mono`}>{props.hint}</span>
      )}
    </label>
  );
}
