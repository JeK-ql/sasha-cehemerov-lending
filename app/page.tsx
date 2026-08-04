import { ViewTransition } from 'react';
import { preload } from 'react-dom';
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { Header } from '@/components/Header/Header';
import { ProductHero } from '@/components/ProductHero/ProductHero';
import { BuyOverlay } from '@/components/BuyOverlay/BuyOverlay';
import { PedalSticker } from '@/components/PedalSticker/PedalSticker';
import { Footer } from '@/components/Footer/Footer';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import { PRODUCTS } from '@/lib/products';
import { productLd } from '@/lib/structuredData';
import { ORDER_REF_RE } from '@/lib/orderReference';
import styles from './page.module.css';

const product = PRODUCTS.DROP01;

type SearchParams = Promise<{ paid?: string; ref?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  preload('/video.jpg', { as: 'image', fetchPriority: 'high' });
  const { paid, ref } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;
  const orderRef = ref && ORDER_REF_RE.test(ref) ? ref : undefined;

  return (
    <CheckoutProvider product={product}>
      {/* Перехід «зін-флаєр» (див. globals.css): коли педаль накриває екран,
          головна лишається видимою під нею і ледь відступає вглиб; на
          зворотному шляху — чекає під флаєром, що падає. Для решти навігацій
          default="none" вимикає анімацію. */}
      <ViewTransition
        exit={{ 'pedal-open': 'page-under-hold', default: 'none' }}
        enter={{ 'pedal-close': 'page-under-reveal', default: 'none' }}
        default="none"
      >
        <main className={styles.page}>
          <h1 className={styles.srOnly}>
            too much яром too much долиною — оверсайз-футболка Sasha Chemerov × Димна Суміш, Drop 01
          </h1>
          <Header caption={product.headerCaption} />
          <ProductHero product={product} />
          <BuyOverlay />
          <PedalSticker />
          <Footer />
          {thankState && (
            <ThankYou state={thankState} orderRef={orderRef} homePath={product.path} />
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
