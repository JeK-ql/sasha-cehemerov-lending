'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRODUCT } from '@/lib/config';
import type { CheckoutInput } from '@/lib/types';
import styles from './CheckoutModal.module.css';
import { NovaPoshtaPicker } from './NovaPoshtaPicker';

const EMPTY: CheckoutInput = { fullName: '', phone: '', email: '', city: '', cityRef: '', warehouse: '' };

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutInput>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof CheckoutInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const valid =
    data.fullName.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    /^\+?\d{9,15}$/.test(data.phone.replace(/\s/g, '')) &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) &&
    data.city.trim().length > 0 &&
    data.warehouse.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
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
        <Image src="/front.jpg" alt="" width={54} height={54} className={styles.thumb} />
        <div className={styles.orderInfo}>
          <div className={styles.orderName}>{PRODUCT.name}</div>
          <div className={`${styles.orderMeta} mono`}>OVERSIZE · ОДИН РОЗМІР · ×1</div>
        </div>
        <div className={`${styles.orderPrice} poster`}>{PRODUCT.price}&nbsp;₴</div>
      </div>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>01 — Хто ти</legend>
        <Field label="Прізвище та ім'я" value={data.fullName} onChange={set('fullName')} />
        <Field label="Телефон" value={data.phone} onChange={set('phone')} type="tel" inputMode="tel" />
        <Field label="E-mail" value={data.email} onChange={set('email')} type="email"
          hint="сюди WayForPay надішле фіскальний чек" />
      </fieldset>

      <fieldset className={styles.block}>
        <legend className={`${styles.legend} mono`}>02 — Куди везти</legend>
        <NovaPoshtaPicker
          onSelect={(city, cityRef, warehouse) => setData((d) => ({ ...d, city, cityRef, warehouse }))}
        />
      </fieldset>

      <button type="submit" className={styles.pay} disabled={!valid || submitting}>
        {submitting ? 'ЗАЧЕКАЙТЕ…' : 'ОПЛАТИТИ КАРТОЮ'}
        <span className={`${styles.payWp} mono`}>WAYFORPAY · APPLE PAY · GOOGLE PAY</span>
      </button>
    </form>
  );
}

function Field(props: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; inputMode?: 'tel' | 'email' | 'text'; hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={`${styles.fieldLabel} mono`}>{props.label}</span>
      <input
        className={styles.input}
        type={props.type ?? 'text'}
        inputMode={props.inputMode}
        value={props.value}
        onChange={props.onChange}
      />
      {props.hint && <span className={`${styles.fieldHint} mono`}>{props.hint}</span>}
    </label>
  );
}
