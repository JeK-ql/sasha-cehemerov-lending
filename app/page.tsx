import { preload } from 'react-dom';
import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { Header } from '@/components/Header/Header';
import { BuyOverlay } from '@/components/BuyOverlay/BuyOverlay';
import { Footer } from '@/components/Footer/Footer';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import styles from './page.module.css';

type SearchParams = Promise<{ paid?: string; ref?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  preload('/video.jpg', { as: 'image', fetchPriority: 'high' });
  const { paid, ref } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;
  // Номер замовлення для перевірки фактичного статусу оплати в базі.
  const orderRef = ref && /^DROP01-\d{10,16}$/.test(ref) ? ref : undefined;

  return (
    <CheckoutProvider>
      <main className={styles.page}>
        <h1 className={styles.srOnly}>
          too much яром too much долиною — оверсайз-футболка Sasha Chemerov × Димна Суміш, Drop 01
        </h1>
        <Header />
        <video
          className={styles.fill}
          src="/tshirt.mp4"
          poster="/video.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <BuyOverlay />
        <Footer />
        {thankState && <ThankYou state={thankState} orderRef={orderRef} />}
      </main>
    </CheckoutProvider>
  );
}
