import TermsConditionsPage from '@/components/TermsConditionsPage';

export const metadata = {
  title: 'Termos e Condições',
  description:
    'Termos e condições de uso da plataforma MozHost (Eliobros Tech): uso aceitável, limites de recursos, pagamentos via M-Pesa/e-Mola e responsabilidades.',
  alternates: { canonical: '/terms' },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Termos e Condições — MozHost',
    description:
      'Regras de uso, limites de recursos e responsabilidades da plataforma MozHost.',
    url: '/terms',
    type: 'article',
  },
};

export default function Page() {
  return <TermsConditionsPage />;
}
