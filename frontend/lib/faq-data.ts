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
  { q: 'Quanto custa criar um container?', a: 'Criar um container custa 500 coins. Você pode comprar coins via M-Pesa (50 MT = 500 coins), e-Mola (50 MT = 500 coins) ou MercadoPago (R$ 5 = 500 coins).' },
  { q: 'Como compro coins na MozHost?', a: 'Acesse seu perfil, role até "Comprar Coins" e escolha M-Pesa, e-Mola (Moçambique) ou MercadoPago (Brasil). Coins são creditados em até 5 minutos.' },
  { q: 'Os coins expiram?', a: 'Não. Os coins não têm prazo de validade — você usa quando quiser.' },
  { q: 'Posso pedir reembolso?', a: 'Sim, em até 7 dias após a compra, desde que os coins não tenham sido utilizados. Contacte o suporte por email mozhost@topaziocoin.online ou WhatsApp +258 86 284 0075.' },
  { q: 'Quanto custa um database por dia?', a: 'Cada database custa 5 coins por dia (~150 coins/mês).' },
  { q: 'Existe plano mensal na MozHost?', a: 'Trabalhamos com coins pré-pagos. Mais flexível: paga só pelo que usar.' },
  { q: 'Quais tipos de containers posso criar?', a: 'Node.js (JavaScript/TypeScript), Python (Flask) e PHP (com MySQL e phpMyAdmin). Go e Spring Boot em breve.' },
  { q: 'Posso ter mais de um container?', a: 'Sim, desde que tenha coins suficientes. Cada container custa 500 coins.' },
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
