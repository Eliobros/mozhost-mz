// app/(public)/docs/faq/page.tsx
import type { Metadata } from 'next';
import FAQClient from '@/components/FAQ/FAQClient';
import { buildFaqSchema } from '@/lib/faq-data';

export const metadata: Metadata = {
  title: 'Perguntas Frequentes (FAQ)',
  description:
    'Respostas rápidas sobre MozHost: pagamento M-Pesa/e-Mola, criação de containers de bots (WhatsApp, Telegram, Discord), databases MySQL/PostgreSQL/MongoDB, CLI e suporte técnico.',
  alternates: { canonical: '/docs/faq' },
  keywords: [
    'faq mozhost',
    'dúvidas hospedagem bots',
    'como pagar mpesa',
    'moçambique bots',
  ],
  openGraph: {
    title: 'FAQ MozHost — Perguntas Frequentes',
    description:
      'Tire suas dúvidas sobre containers, bots WhatsApp, databases, pagamento M-Pesa/e-Mola e suporte MozHost.',
    url: '/docs/faq',
    type: 'website',
  },
};

/**
 * JSON-LD FAQPage schema — gerado a partir do mesmo FAQ_DATA usado pelo
 * FAQClient (single source of truth em `lib/faq-data.ts`). Isto previne
 * "structured data mismatch" no Google (penalização direta em SEO).
 */
export default function FAQPage() {
  const faqSchema = buildFaqSchema();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FAQClient />
    </>
  );
}
