import Image from 'next/image';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.hero}>
      <Image src="/hero.jpg" alt="Саша Чемеров" fill priority className={styles.photo} sizes="100vw" />
      <div className={styles.grad} />
      <h1 className={styles.title}>
        <span>TOO MUCH ЯРОМ</span>
        <span>TOO MUCH <span className={styles.red}>ДОЛИНОЮ</span></span>
      </h1>
      <span className={`${styles.cue} mono`}>↓ мерч</span>
    </section>
  );
}
