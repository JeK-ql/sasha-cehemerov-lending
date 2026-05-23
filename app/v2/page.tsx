import { CheckoutProvider } from '@/components/v2/Checkout/CheckoutProvider';
import { Header } from '@/components/v2/Header/Header';
import { BuyOverlay } from '@/components/v2/BuyOverlay/BuyOverlay';
import styles from './page.module.css';

export const metadata = {
  title: '[V2] too much яром too much долиною — Sasha Chemerov',
};

export default function HomeV2() {
  return (
    <CheckoutProvider>
      <main className={styles.page}>
        <Header />
        <video
          className={styles.fill}
          src="/example.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <BuyOverlay />
      </main>
    </CheckoutProvider>
  );
}
