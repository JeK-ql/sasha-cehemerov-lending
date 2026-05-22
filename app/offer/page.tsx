import { LegalPage } from '@/components/Legal/LegalPage';

export const metadata = { title: 'Публічна оферта — Sasha Chemerov' };

export default function OfferPage() {
  return (
    <LegalPage title="Публічна оферта">
      <p>
        Текст публічної оферти надає клієнт/юрист. Документ обовʼязковий для
        підключення платіжного шлюзу WayForPay.
      </p>
      <h2>1. Загальні положення</h2>
      <p>[Контент від клієнта]</p>
      <h2>2. Предмет договору</h2>
      <p>[Контент від клієнта]</p>
      <h2>3. Оплата та доставка</h2>
      <p>[Контент від клієнта]</p>
    </LegalPage>
  );
}
