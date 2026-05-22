'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './Gallery.module.css';

const SLIDES = [
  { src: '/front.webp', cap: 'ПЕРЕД' },
  { src: '/back.webp', cap: 'СПИНА' },
  { src: '/artist-front.webp', cap: 'ЧЕМЕРОВ · ПЕРЕД' },
  { src: '/artist-back.webp', cap: 'ЧЕМЕРОВ · СПИНА' },
];

export function Gallery() {
  const [active, setActive] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Auto-slide that resets its interval on manual slide changes (prevents sudden changes)
  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 2800);
    return () => clearInterval(id);
  }, [active]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setActive((i) => (i + 1) % SLIDES.length);
    } else if (isRightSwipe) {
      setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <section className={styles.gallery}>
      <h2 className={`${styles.heading} display`}>ексклюзивний дрілл мерч</h2>

      {/* Мобільний авто-слайдер з підтримкою свайпів */}
      <div 
        className={styles.slider} 
        aria-hidden={false}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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

      {/* Десктоп-диптих з інтерактивним спліт-слайдером на ховер */}
      <div className={styles.diptych}>
        <Plate product="/front.webp" reveal="/artist-front.webp" tag="FRONT" />
        <Plate product="/back.webp" reveal="/artist-back.webp" tag="BACK" />
      </div>
    </section>
  );
}

function Plate({ product, reveal, tag }: { product: string; reveal: string; tag: string }) {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    e.currentTarget.style.setProperty('--clip-x', `${x}%`);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // Smoothly hide the split overlay when mouse leaves
    e.currentTarget.style.setProperty('--clip-x', '0%');
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    e.currentTarget.style.setProperty('--clip-x', `${x}%`);
  };

  return (
    <div 
      className={styles.plate}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <Image src={product} alt={tag} fill sizes="50vw" className={styles.plateImg} />
      <Image src={reveal} alt={`${tag} на Чемерові`} fill sizes="50vw" className={styles.plateReveal} />
      <div className={styles.splitter} />
      <span className={`${styles.tag} mono`}>{tag}</span>
    </div>
  );
}

