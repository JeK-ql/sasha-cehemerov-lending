import Image from 'next/image';
import styles from './Showcase.module.css';

export function Showcase() {
  return (
    <section className={styles.showcase}>
      <p className={`${styles.drop} mono`}>Drop 01 / 01</p>

      <h1 className={styles.title}>
        <span className={`${styles.small} mono`}>too much</span>
        <span className={`${styles.big} display`}>яром</span>
        <span className={`${styles.small} ${styles.right} mono`}>too much</span>
        <span className={`${styles.big} ${styles.outline} display`}>долиною</span>
      </h1>

      <div className={styles.tees}>
        <figure className={`${styles.tee} ${styles.front}`}>
          <Image
            src="/front-back-without-bg.png"
            alt="Футболка «too much яром too much долиною» — перед"
            fill
            priority
            sizes="(min-width: 768px) 38vw, 58vw"
            className={styles.teeImg}
          />
          <figcaption className={`${styles.cap} mono`}>01 — Перед</figcaption>
        </figure>
        <figure className={`${styles.tee} ${styles.back}`}>
          <Image
            src="/back-without-bg.png"
            alt="Футболка «too much яром too much долиною» — спина"
            fill
            sizes="(min-width: 768px) 34vw, 50vw"
            className={styles.teeImg}
          />
          <figcaption className={`${styles.cap} mono`}>02 — Спина</figcaption>
        </figure>
      </div>

      <p className={`${styles.spec} mono`}>Oversize · 100% Бавовна · Heavyweight</p>
    </section>
  );
}
