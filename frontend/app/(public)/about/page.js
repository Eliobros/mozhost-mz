import AboutPage from '@/components/AboutPage';

export const metadata = {
  title: 'Sobre a MozHost',
  description:
    'Conheça a história da MozHost e da Eliobros Tech: plataforma moçambicana de hospedagem de bots e APIs criada em 2024 para programadores africanos.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'Sobre a MozHost — Construída num telemóvel para quem cria sem limites',
    description:
      'A história da plataforma moçambicana feita para programadores. Hospedagem Docker, suporte em português e pagamento local.',
    url: '/about',
    type: 'profile',
  },
};

export default function Page() {
  return <AboutPage />;
}
