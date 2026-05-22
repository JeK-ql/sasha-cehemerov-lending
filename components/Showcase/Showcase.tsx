import Image from 'next/image';
import styles from './Showcase.module.css';

export function Showcase() {
  return (
    <section className={styles.showcase}>
      <h1 className={styles.title}>
        <span className={`${styles.line} ${styles.lineLeft}`}>
          <span className={`${styles.small} mono`}>too much</span>
          <span className={`${styles.big} display`}>яром</span>
        </span>
        <span className={`${styles.line} ${styles.lineRight}`}>
          <span className={`${styles.small} mono`}>too much</span>
          <span className={`${styles.big} ${styles.red} display`}>долиною</span>
        </span>
      </h1>

      <div className={styles.tees}>
        <figure className={styles.tee}>
          <div className={styles.teeFrame}>
            <Image
              src="/front-without-bg-2.png"
              alt="Футболка «too much яром too much долиною» — перед"
              fill
              priority
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 34vw, 70vw"
              className={styles.teeImg}
            />
          </div>
        </figure>
        <figure className={styles.tee}>
          <div className={styles.teeFrame}>
            <Image
              src="/back-without-bg-2.png"
              alt="Футболка «too much яром too much долиною» — спина"
              fill
              priority
              sizes="(min-width: 1024px) 24vw, (min-width: 768px) 34vw, 70vw"
              className={styles.teeImg}
            />
          </div>
        </figure>
      </div>

      <p className={`${styles.spec} mono`}>Oversize · 100% Бавовна · Heavyweight</p>
    </section>
  );
}
