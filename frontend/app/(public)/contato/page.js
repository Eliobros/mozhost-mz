import ContactPage from '@/components/ContactPage';

export const metadata = {
  title: 'Contacto',
  description:
    'Entre em contacto com a equipa MozHost. Suporte técnico, dúvidas sobre pagamentos, sugestões e reporte de bugs. WhatsApp, Email e formulário online.',
  alternates: { canonical: '/contato' },
  openGraph: {
    title: 'Contacto MozHost — Estamos aqui para ajudar',
    description:
      'Canais de contacto da MozHost: WhatsApp directo, Email e formulário online. Respondemos em até 24 horas úteis.',
    url: '/contato',
    type: 'website',
  },
};

export default function Page() {
  return <ContactPage />;
}
