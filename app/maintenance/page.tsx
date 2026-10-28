import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/components/Header/Header';
import { MAINTENANCE_MODE } from '@/lib/maintenance';
import styles from './maintenance.module.css';

export const metadata: Metadata = {
  title: 'Тимчасово не працюємо',
  robots: { index: false, follow: false },
};

/* Заглушка, на яку proxy.ts переписує всі сторінки, поки MAINTENANCE_MODE.
   Без футера: у ньому посилання на товари, а купити зараз нічого не можна. */
export default function MaintenancePage() {
  if (!MAINTENANCE_MODE) notFound();

  return (
    <main className={styles.page}>
      <Header caption="" />

      <section className={styles.content}>
        <h1 className={`${styles.headline} poster`}>Тимчасово не працюємо</h1>
      </section>
    </main>
  );
}
