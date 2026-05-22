import Image from 'next/image';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.hero}>
      <Image src="/hero.webp" alt="Саша Чемеров" fill priority className={styles.photo} sizes="100vw" />
      <div className={styles.grad} />
      <h1 className={`${styles.title} gothic`}>
        <span>too much яром</span>
        <span>too much <span className={styles.red}>долиною</span></span>
      </h1>
      <span className={`${styles.cue} mono`}>↓ мерч</span>
    </section>
  );
}
