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
        <h1 className={styles.srOnly}>
          too much яром too much долиною — оверсайз-футболка Sasha Chemerov × Димна Суміш, Drop 01
        </h1>
        <Header />
        <Showcase />
        <OrderBar />
        <Footer />
      </main>
    </CheckoutProvider>
  );
}
