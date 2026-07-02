import PrivacyPolicyPage from '@/components/PrivacyPolicyPage';

export const metadata = {
  title: 'Política de Privacidade',
  description:
    'Política de privacidade da MozHost (Eliobros Tech): como coletamos, usamos, armazenamos e protegemos os dados dos utilizadores em conformidade com o GDPR.',
  alternates: { canonical: '/privacy' },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Política de Privacidade — MozHost',
    description:
      'Como protegemos os seus dados pessoais na MozHost. Conformidade GDPR e práticas de segurança.',
    url: '/privacy',
    type: 'article',
  },
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
