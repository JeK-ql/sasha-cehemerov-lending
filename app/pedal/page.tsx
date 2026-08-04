import type { Metadata, Viewport } from 'next';
import { ViewTransition } from 'react';
import { preload } from 'react-dom';
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
// Власні хедер/футер сторінки педалі — щоб її можна було перефарбувати
// незалежно від головної. Див. Step 6.
import { PedalHeader } from '@/components/Header/PedalHeader';
import { PedalBuy } from '@/components/PedalBuy/PedalBuy';
import { PedalFooter } from '@/components/Footer/PedalFooter';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import { PRODUCTS } from '@/lib/products';
import { productLd } from '@/lib/structuredData';
import { ORDER_REF_RE } from '@/lib/orderReference';
import { SITE_URL } from '@/lib/config';
import styles from './pedal.module.css';

const product = PRODUCTS.PEDAL01;

export const metadata: Metadata = {
  title: 'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 10 шт.',
  description:
    'Фузз-дисторшн «Димна Суміш» на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 10 екземплярів. 13000 ₴, доставка по Україні та за кордон.',
  alternates: { canonical: '/pedal' },
  openGraph: {
    title: 'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров',
    description: 'Лімітована серія 10 екземплярів. Ручна робота. 13000 ₴.',
    url: `${SITE_URL}${product.path}`,
    siteName: 'isusneisus.com',
    locale: 'uk_UA',
    type: 'website',
    // Без images шер у Instagram/Telegram/Facebook рендериться як голий текст.
    images: [product.ogImage!],
  },
};

// Сторінка кислотно-зелена від краю до краю, тому смуга браузера збігається
// з нею, а не зі світлим кольором решти сайту (він у app/layout.tsx).
export const viewport: Viewport = {
  themeColor: '#cded16',
};

/**
 * Текст, запечений у зін-макет. Картинки — це растр, тому пошуковик і
 * скрінрідер бачать сторінку тільки через ці абзаци: вони дослівно
 * повторюють намальоване, а не переказують його.
 */
const BLOCKS = [
  {
    src: '/zine-1.png',
    width: 1440,
    height: 519,
    frame: 'frame1',
    text: 'Це ексклюзивна лімітована колаборація Kosko FX та Саші Чемерова, створена спеціально для шанувальників творчості гурту «Димна Суміш». Педаль зібрана повністю вручну, а серія обмежена лише 10 екземплярами.',
  },
  {
    src: '/zine-2.png',
    width: 1440,
    height: 911,
    frame: 'frame2',
    text: 'В основі «Димна Суміш» лежить схема EQD Hizumitas — фузз-дисторшн із монументальним характером. Ми зберегли весь його фірмовий жир, але зробили звук ще універсальнішим. Педаль має виключно щільний та пружний низ, завдяки чому працює не лише з електрогітарою, а й з басом. Крім того, ми злегка підняли середні частоти, тому інструмент більше не провалюється в загальному міксі та чітко прорізає будь-яку пачку.',
  },
  {
    src: '/zine-3.png',
    width: 1203,
    height: 934,
    frame: 'frame3',
    text: 'Керування ефектом класичне та інтуїтивне: ручки Volume, Tone та Sustain дозволяють легко вирулити як легкий динамічний драйв для фактурних партій, так і агресивний фузз для важких рифів.',
  },
] as const;

type SearchParams = Promise<{ paid?: string; ref?: string }>;

export default async function PedalPage({ searchParams }: { searchParams: SearchParams }) {
  // Леттеринг — LCP-елемент сторінки: він перший на екрані й важить 37 КБ.
  // preload дає браузеру знати про файл ще до розбору розмітки.
  preload('/zine-title.png', { as: 'image', fetchPriority: 'high' });
  const { paid, ref } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;
  const orderRef = ref && ORDER_REF_RE.test(ref) ? ref : undefined;

  return (
    <CheckoutProvider product={product}>
      {/* Перехід «зін-флаєр» (див. globals.css): сторінка-зін заїжджає знизу
          поверх головної і так само падає вниз на зворотному шляху. Для решти
          навігацій (browser back, /offer) default="none" вимикає анімацію. */}
      <ViewTransition
        enter={{ 'pedal-open': 'zine-rise', default: 'none' }}
        exit={{ 'pedal-close': 'zine-drop', default: 'none' }}
        default="none"
      >
        <main className={styles.page}>
          <h1 className={styles.srOnly}>
            Димна Суміш — фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 10 екземплярів
          </h1>
          <div className={styles.zine}>
            <PedalHeader />
            {BLOCKS.map((b) => (
              <figure key={b.src} className={`${styles.frame} ${styles[b.frame]}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.block}
                  src={b.src}
                  width={b.width}
                  height={b.height}
                  alt=""
                  decoding="async"
                />
                <figcaption className={styles.srOnly}>{b.text}</figcaption>
              </figure>
            ))}
          </div>
          <PedalBuy />
          <PedalFooter />
          {thankState && (
            <ThankYou
              state={thankState}
              orderRef={orderRef}
              homePath={product.path}
              theme={product.checkoutTheme}
            />
          )}
        </main>
      </ViewTransition>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd(product)) }}
      />
    </CheckoutProvider>
  );
}
