import Image from 'next/image';
import styles from './Showcase.module.css';

export function Showcase() {
  return (
    <section className={styles.showcase}>
      <h1 className={styles.title}>
        <span className={styles.line}>
          <span className={`${styles.small} mono`}>too much</span>
          <span className={`${styles.big} display`}>яром</span>
        </span>
        <span className={styles.line}>
          <span className={`${styles.small} mono`}>too much</span>
          <span className={`${styles.big} ${styles.red} display`}>долиною</span>
        </span>
      </h1>

      <div className={styles.tees}>
        <figure className={styles.tee}>
          <div className={styles.teeFrame}>
            <Image
              src="/front-back-without-bg.png"
              alt="Футболка «too much яром too much долиною» — перед"
              fill
              priority
              sizes="(min-width: 768px) 42vw, 48vw"
              className={styles.teeImg}
            />
          </div>
          <figcaption className={`${styles.cap} mono`}>01 — Перед</figcaption>
        </figure>
        <figure className={styles.tee}>
          <div className={styles.teeFrame}>
            <Image
              src="/back-without-bg.png"
              alt="Футболка «too much яром too much долиною» — спина"
              fill
              sizes="(min-width: 768px) 42vw, 48vw"
              className={styles.teeImg}
            />
          </div>
          <figcaption className={`${styles.cap} mono`}>02 — Спина</figcaption>
        </figure>
      </div>

      <p className={`${styles.spec} mono`}>Oversize · 100% Бавовна · Heavyweight</p>
    </section>
  );
}
