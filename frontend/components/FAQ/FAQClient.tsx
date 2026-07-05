"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { FAQ_DATA, type FaqEntry } from '@/lib/faq-data';

/**
 * FAQClient — parte interativa (cliente) da FAQ Page.
 *
 * É um Server Component wrapper em `app/(public)/docs/faq/page.tsx` que emite
 * metadata + JSON-LD FAQPage schema; este componente faz a parte visual
 * (pesquisa + acordeão).
 *
 * IMPORTANTE: as perguntas vêm de `lib/faq-data.ts` — a mesma fonte que o
 * JSON-LD schema consome. Isso garante que o que o Google vê bate sempre
 * com o que o utilizador vê (sem "structured data mismatch").
 */

type Category = {
  name: string;
  questions: FaqEntry[];
};

/**
 * Agrupa o FAQ_DATA por categoria. As categorias são deriváveis das próprias
 * perguntas (prefixo emoji). Se adicionares perguntas em lib/faq-data.ts sem
 * respeitarem o prefixo, podes precisar de reorganizar isto.
 */
function categorize(entries: FaqEntry[]): Category[] {
  const buckets: Record<string, FaqEntry[]> = {};
  entries.forEach((entry) => {
    // Heurística simples: nome da categoria inferido da primeira palavra-chave
    // caso o texto siga o padrão "<emoji> Categoria: ...". Para simplicidade
    // optamos por categorias fixas pelas palavras-chave mais frequentes:
    const text = entry.q.toLowerCase();
    let key = '⚙️ Geral';
    if (/coin|m[-\s]?pesa|e[-\s]?mola|reembolso|pagamento/.test(text)) key = '💰 Pagamento e Coins';
    else if (/container|criar|reiniciar|ram|armazenamento/.test(text)) key = '🖥️ Containers';
    else if (/database|mysql|mongo|postgres|redis|banco/.test(text)) key = '🗄️ Databases';
    else if (/cli|deploy|npm/.test(text)) key = '🔧 CLI';
    else if (/domín|ssl|https|uptime|dom[ií]nio|dom\.io/.test(text)) key = '⚙️ Técnico';
    else if (/suporte|contato|documenta|v[ií]deos?|bug|reportar|whatsapp.+canal/.test(text)) key = '🆘 Suporte';
    else if (/segur|privacidade|acessar meus dados|cart[aã]o/.test(text)) key = '🔒 Segurança';
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(entry);
  });
  return Object.entries(buckets).map(([name, questions]) => ({ name, questions }));
}

export default function FAQClient() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = categorize(FAQ_DATA);

  const filtered = categories
    .map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (faq) =>
          faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.a.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.questions.length > 0);

  const toggleQuestion = (catIndex: number, qIndex: number) => {
    setOpenIndex(openIndex === `${catIndex}-${qIndex}` ? null : `${catIndex}-${qIndex}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/docs" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Voltar para Documentação
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Perguntas Frequentes (FAQ)</h1>
        <p className="text-xl text-gray-600">
          Encontre respostas rápidas para as dúvidas mais comuns sobre a MozHost.
        </p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pesquisar perguntas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma pergunta encontrada para &quot;{searchTerm}&quot;</p>
          <button onClick={() => setSearchTerm('')} className="mt-4 text-blue-600 hover:text-blue-800">
            Limpar pesquisa
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((cat, ci) => (
            <div key={ci}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{cat.name}</h2>
              <div className="space-y-3">
                {cat.questions.map((faq, qi) => {
                  const isOpen = openIndex === `${ci}-${qi}`;
                  return (
                    <div key={qi} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleQuestion(ci, qi)}
                        className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900 pr-8">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-8 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-3">Não encontrou sua resposta?</h3>
        <p className="text-gray-700 mb-6">Entre em contato conosco! Nossa equipe está pronta para ajudar.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href="mailto:mozhost@topaziocoin.online" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">📧 Email</a>
          <a href="https://api.whatsapp.com/send?phone=258862840075&text=Ola%20preciso%20de%20ajuda" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium">💬 WhatsApp</a>
          <a href="https://whatsapp.com/channel/0029Vb6ydZS6rsQoxPBd861W" target="_blank" rel="noopener noreferrer" className="bg-white text-blue-600 border-2 border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-medium">👥 Comunidade</a>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <Link href="/docs/comprar-coins" className="text-blue-600 hover:text-blue-800 flex items-center">
            ← Comprar Coins
          </Link>
          <Link href="/docs/suporte" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium">
            Próximo: Suporte →
          </Link>
        </div>
      </div>
    </div>
  );
}
