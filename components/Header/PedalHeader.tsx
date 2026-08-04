/**
 * Хедер сторінки педалі. Свідома копія Header: /pedal має розходитись
 * візуально з головною, тому спільний компонент тут навмисно не
 * використовується. Правки одного НЕ переносяться в інший автоматично.
 */
import styles from './PedalHeader.module.css';

export function PedalHeader({ caption }: { caption: string }) {
  return (
    <header className={styles.header}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Саша Чемеров — Димна Суміш"
        width={495}
        height={140}
        className={styles.logo}
      />
      <span className={`${styles.drop} mono`}>{caption}</span>
    </header>
  );
}
