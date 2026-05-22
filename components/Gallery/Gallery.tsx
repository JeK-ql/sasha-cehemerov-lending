'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './Gallery.module.css';

const SLIDES = [
  { src: '/front.jpg', cap: 'ПЕРЕД' },
  { src: '/back.jpg', cap: 'СПИНА' },
  { src: '/artist-front.jpg', cap: 'ЧЕМЕРОВ · ПЕРЕД' },
  { src: '/artist-back.jpg', cap: 'ЧЕМЕРОВ · СПИНА' },
];

export function Gallery() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <section className={styles.gallery}>
      <h2 className={`${styles.heading} display`}>ексклюзий дрілл мерч</h2>

      {/* Мобільний авто-слайдер */}
      <div className={styles.slider} aria-hidden={false}>
        <div className={styles.stage}>
          {SLIDES.map((s, i) => (
            <div key={s.src} className={`${styles.frame} ${i === active ? styles.on : ''}`}>
              <Image src={s.src} alt={s.cap} fill sizes="100vw" className={styles.frameImg} />
            </div>
          ))}
        </div>
        <div className={styles.bar}><span style={{ width: `${((active + 1) / SLIDES.length) * 100}%` }} /></div>
        <div className={`${styles.cap} mono`}>
          <span>{SLIDES[active].cap}</span>
          <span>{String(active + 1).padStart(2, '0')} / 0{SLIDES.length}</span>
        </div>
      </div>

      {/* Десктоп-диптих з ховером */}
      <div className={styles.diptych}>
        <Plate product="/front.jpg" reveal="/artist-front.jpg" tag="FRONT" />
        <Plate product="/back.jpg" reveal="/artist-back.jpg" tag="BACK" />
      </div>
    </section>
  );
}

function Plate({ product, reveal, tag }: { product: string; reveal: string; tag: string }) {
  return (
    <div className={styles.plate}>
      <Image src={product} alt={tag} fill sizes="50vw" className={styles.plateImg} />
      <Image src={reveal} alt={`${tag} на Чемерові`} fill sizes="50vw" className={styles.plateReveal} />
      <span className={`${styles.tag} mono`}>{tag}</span>
    </div>
  );
}
