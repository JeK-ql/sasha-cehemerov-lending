import Link from 'next/link';
import { Header } from '@/components/Header/Header';
import { Footer } from '@/components/Footer/Footer';
import { PRODUCTS } from '@/lib/products';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Header caption={PRODUCTS.DROP01.headerCaption} />

      <section className={styles.content}>
        <p className={`${styles.kicker} mono`}>DROP 01 // Загублена сторінка</p>

        <div className={styles.posterBlock}>
          <span className={`${styles.code} display`} aria-hidden="true">
            404
          </span>
          <h1 className={`${styles.headline} poster`}>Цієї сторінки нема</h1>
        </div>

        <p className={styles.support}>
          Лінк застарів або в адресі одрук.
        </p>

        <Link href="/" className={styles.cta}>
          До дропу
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
        </Link>
      </section>

      <Footer />
    </main>
  );
}
