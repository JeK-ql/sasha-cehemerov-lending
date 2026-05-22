import { CheckoutProvider } from '@/components/Checkout/CheckoutProvider';
import { Header } from '@/components/Header/Header';
import { Hero } from '@/components/Hero/Hero';
import { Gallery } from '@/components/Gallery/Gallery';
import { OrderBar } from '@/components/OrderBar/OrderBar';
import { Footer } from '@/components/Footer/Footer';

export default function Home() {
  return (
    <CheckoutProvider>
      <main>
        <Header />
        <Hero />
        <Gallery />
        <OrderBar />
        <Footer />
      </main>
    </CheckoutProvider>
  );
}
