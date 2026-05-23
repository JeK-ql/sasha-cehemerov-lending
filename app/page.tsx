import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { Header } from '@/components/Header/Header';
import { Showcase } from '@/components/Showcase/Showcase';
import { OrderBar } from '@/components/OrderBar/OrderBar';
import { Footer } from '@/components/Footer/Footer';
import styles from './page.module.css';

export default function Home() {
  return (
    <CheckoutProvider>
      <main className={styles.shell}>
        <Header />
        <Showcase />
        <OrderBar />
        <Footer />
      </main>
    </CheckoutProvider>
  );
}
