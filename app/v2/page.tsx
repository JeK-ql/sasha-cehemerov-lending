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
        <h1 className={styles.srOnly}>
          too much яром too much долиною — оверсайз-футболка Sasha Chemerov × Димна Суміш, Drop 01
        </h1>
        <Header />
        <video
          className={styles.fill}
          src="/example-v2.mp4"
          poster="/video.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <BuyOverlay />
      </main>
    </CheckoutProvider>
  );
}
