import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
// Власні хедер/футер сторінки педалі — щоб її можна було перефарбувати
// незалежно від головної. Див. Step 6.
import { PedalHeader } from '@/components/Header/PedalHeader';
import { ProductHero } from '@/components/ProductHero/ProductHero';
import { BuyOverlay } from '@/components/BuyOverlay/BuyOverlay';
import { PedalFooter } from '@/components/Footer/PedalFooter';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import { PRODUCTS } from '@/lib/products';
import { productLd } from '@/lib/structuredData';
import { ORDER_REF_RE } from '@/lib/orderReference';
import { SITE_URL } from '@/lib/config';
import styles from '../page.module.css';

const product = PRODUCTS.PEDAL01;

export const metadata: Metadata = {
  title: 'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 10 шт.',
  description:
    'Фузз-дисторшн «Димна Суміш» на основі схеми EarthQuaker Devices Hizumitas. Ручна робота, тираж 10 екземплярів. 3000 ₴, доставка по Україні та за кордон.',
  alternates: { canonical: '/pedal' },
  openGraph: {
    title: 'Димна Суміш - фузз-педаль Kosko FX × Саша Чемеров',
    description: 'Лімітована серія 10 екземплярів. Ручна робота. 3000 ₴.',
    url: `${SITE_URL}${product.path}`,
    siteName: 'isusneisus.com',
    locale: 'uk_UA',
    type: 'website',
    // Без images шер у Instagram/Telegram/Facebook рендериться як голий текст.
    images: [product.ogImage!],
  },
};

type SearchParams = Promise<{ paid?: string; ref?: string }>;

export default async function PedalPage({ searchParams }: { searchParams: SearchParams }) {
  // Хіро — LCP-елемент сторінки; підказуємо браузеру якнайшвидше почати
  // завантаження фото педалі. Плейсхолдер немає файлу — preload там
  // не викликаємо, щоб не тягнути неіснуючий ресурс.
  if (product.media.kind === 'image') {
    preload(product.media.src, { as: 'image', fetchPriority: 'high' });
  }
  const { paid, ref } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;
  const orderRef = ref && ORDER_REF_RE.test(ref) ? ref : undefined;

  return (
    <CheckoutProvider product={product}>
      <main className={styles.page}>
        <h1 className={styles.srOnly}>
          Димна Суміш — фузз-педаль Kosko FX × Саша Чемеров, лімітована серія 10 екземплярів
        </h1>
        <PedalHeader caption={product.headerCaption} />
        <ProductHero product={product} />
        <BuyOverlay />
        <PedalFooter />
        {thankState && (
          <ThankYou state={thankState} orderRef={orderRef} homePath={product.path} />
        )}
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd(product)) }}
      />
    </CheckoutProvider>
  );
}
