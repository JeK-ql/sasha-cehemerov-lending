'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PRODUCT } from '@/lib/config';
import type { CheckoutInput } from '@/lib/types';
import styles from './CheckoutModal.module.css';

const EMPTY: CheckoutInput = { fullName: '', phone: '', email: '', city: '', cityRef: '', warehouse: '' };

export function CheckoutForm() {
  const [data, setData] = useState<CheckoutInput>(EMPTY);
  const set = (k: keyof CheckoutInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }));

  const valid =
    data.fullName.trim().length > 2 &&
    /^\+?\d{9,15}$/.test(data.phone.replace(/\s/g, '')) &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email) &&
    data.city.trim().length > 0 &&
    data.warehouse.trim().length > 0;

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
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
        <Field label="Місто" value={data.city} onChange={set('city')} />
        <Field label="Відділення / поштомат Нової Пошти" value={data.warehouse} onChange={set('warehouse')} />
      </fieldset>

      <button type="submit" className={styles.pay} disabled={!valid}>
        ОПЛАТИТИ КАРТОЮ
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
