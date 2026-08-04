/**
 * Хедер сторінки педалі — леттеринг «Димна Суміш» із зін-макета.
 *
 * Не sticky і без підпису дропа, на відміну від Header головної: у макеті це
 * верхній край полотна, а не панель навігації, і липка смуга на 23% ширини
 * з'їдала б екран. Фон не свій — зелену текстуру малює .page сторінки, щоб
 * між хедером і блоками не було стику.
 */
import styles from './PedalHeader.module.css';

export function PedalHeader() {
  return (
    <header className={styles.header}>
      {/* Назву товару вже несе h1 сторінки, тож леттеринг тут декоративний:
          alt="" прибирає дубль в озвучці скрінрідера.
          eslint-disable-next-line @next/next/no-img-element */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/zine-title.png"
        alt=""
        width={1440}
        height={338}
        className={styles.title}
        fetchPriority="high"
        decoding="async"
      />
    </header>
  );
}
