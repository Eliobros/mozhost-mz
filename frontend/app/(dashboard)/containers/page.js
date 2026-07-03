import { Suspense } from 'react';
import ContainersPage from '@/components/ContainersPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ContainersPage />
    </Suspense>
  );
}
