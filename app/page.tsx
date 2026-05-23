import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { Header } from '@/components/Header/Header';
import { BuyOverlay } from '@/components/BuyOverlay/BuyOverlay';
import { Footer } from '@/components/Footer/Footer';
import { ThankYou } from '@/components/ThankYou/ThankYou';
import styles from './page.module.css';

type SearchParams = Promise<{ paid?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { paid } = await searchParams;
  const thankState = paid === '1' ? 'ok' : paid === '0' ? 'fail' : null;

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
        {thankState && <ThankYou state={thankState} />}
      </main>
    </CheckoutProvider>
  );
}
