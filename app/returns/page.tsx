import { LegalPage } from '@/components/Legal/LegalPage';

export const metadata = { title: 'Умови повернення — Sasha Chemerov' };

export default function ReturnsPage() {
  return (
    <LegalPage title="Умови повернення">
      <p>Текст умов повернення надає клієнт/юрист.</p>
      <h2>1. Строк повернення</h2>
      <p>[Контент від клієнта]</p>
      <h2>2. Порядок повернення</h2>
      <p>[Контент від клієнта]</p>
    </LegalPage>
  );
}
