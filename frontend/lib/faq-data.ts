// lib/faq-data.ts
// Single source of truth para as perguntas/respostas do FAQ.
// Importado tanto pelo Server Component `app/(public)/docs/faq/page.tsx`
// (para gerar o JSON-LD FAQPage schema) quanto pelo client component
// `components/FAQ/FAQClient.tsx` (para renderizar a UI).
//
// Manter as duas fontes sincronizadas MANUALMENTE é propenso a erro e o Google
// penaliza structured data que não bate com o conteúdo visível ao utilizador.

export type FaqEntry = {
  q: string;
  a: string;
};

export const FAQ_DATA: FaqEntry[] = [
  { q: 'Quanto custa criar um container?', a: 'A criação de containers está incluída no seu plano. Escolha o plano em Planos & Pagamentos (M-Pesa, e-Mola ou cartão) e crie containers até o limite do plano.' },
  { q: 'Como funcionam os planos na MozHost?', a: 'Trabalhamos com planos mensais: Starter, Basic, Pro e Business. Cada plano inclui uma quantidade de containers, RAM e armazenamento. Faça upgrade quando precisar de mais recursos.' },
  { q: 'O que acontece se o meu plano expirar?', a: 'Você recebe avisos 5, 3 e 1 dia antes. Após a expiração, os containers são suspensos e os dados preservados por 7 dias para renovação.' },
  { q: 'Posso pedir reembolso?', a: 'Sim, em até 7 dias após a compra. Contacte o suporte por email mozhost@topaziocoin.online ou WhatsApp +258 86 284 0075.' },
  { q: 'Posso criar bancos de dados?', a: 'Sim, MySQL, MariaDB, PostgreSQL, MongoDB e Redis estão disponíveis conforme o seu plano.' },
  { q: 'Quais tipos de containers posso criar?', a: 'Node.js (JavaScript/TypeScript), Python (Flask) e PHP (com MySQL e phpMyAdmin). Go e Spring Boot em breve.' },
  { q: 'Posso ter mais de um container?', a: 'Sim, o limite depende do plano escolhido: Starter (3), Basic (5), Pro (10) e Business (25).', },
  { q: 'Como faço deploy do meu código?', a: 'Pelo editor web integrado (recomendado para iniciantes) ou via CLI com `mozhost deploy` (recomendado para projectos maiores).' },
  { q: 'Meu container parou sozinho — o que fazer?', a: 'Verifique os logs do container para identificar o erro. Contacte o suporte se precisar de ajuda.' },
  { q: 'Quais bancos de dados a MozHost suporta?', a: 'MySQL, MariaDB, PostgreSQL, MongoDB e Redis.' },
  { q: 'Posso usar domínio próprio?', a: 'Sim. Todos os containers recebem subdomínio gratuito (seu-container.mozhost.shop); domínio customizado também é suportado.' },
  { q: 'Vocês suportam HTTPS?', a: 'Sim, certificados SSL/HTTPS automáticos para todos os containers e domínios configurados.' },
  { q: 'Qual é o uptime garantido?', a: 'Trabalhamos para 99% de uptime. Manutenções programadas são comunicadas com antecedência.' },
  { q: 'Posso instalar dependências personalizadas?', a: 'Sim, via package.json (Node.js), requirements.txt (Python) ou composer.json (PHP). São instaladas automaticamente no deploy.' },
  { q: 'Como instalo o CLI MozHost?', a: 'Windows: `npm i -g mozhost-cli`. Linux/Mac: `sudo npm i -g mozhost-cli`. Requer Node.js.' },
  { q: 'Como entro em contacto com o suporte MozHost?', a: 'Email mozhost@topaziocoin.online, WhatsApp +258 86 284 0075 ou comunidade WhatsApp. Respondemos em até 24h.' },
  { q: 'Onde reporto bugs?', a: 'Por WhatsApp ou email, descrevendo o problema com máximo de detalhes (container, mensagem de erro, passos para reproduzir).' },
  { q: 'Meus dados estão seguros na MozHost?', a: 'Sim. Criptografia SSL/TLS em todas as conexões. Dados de pagamento processados por gateways seguros (M-Pesa, e-Mola, MercadoPago) — não armazenamos cartões.' },
  { q: 'Quem pode acessar meu container?', a: 'Apenas você. A equipa MozHost só acederá em suporte técnico expressamente autorizado por si.' },
];

/**
 * Constrói dinamicamente o schema JSON-LD FAQPage a partir do FAQ_DATA.
 * Garantia: se FAQ_DATA mudar, tanto a UI quanto o schema refletem a mudança.
 */
export function buildFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
