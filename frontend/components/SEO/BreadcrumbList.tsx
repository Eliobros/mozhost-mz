// components/SEO/BreadcrumbList.tsx
type BreadcrumbItem = {
  name: string;
  path: string; // relativo, ex: '/docs/criar-conta'
};

// Tipo próprio do payload JSON-LD. Não usamos MetadataRoute.Sitemap[number]
// porque esse tipo é para entries de /sitemap.xml do Next, não para schema.org
// BreadcrumbList (são sistemas diferentes).
type BreadcrumbListSchema = {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    item: { '@id': string; name: string };
  }>;
};

const SITE_URL = 'https://mozhost.shop';

/**
 * JSON-LD BreadcrumbList schema — rich snippet do Google para o trilho de
 * navegação visível nos resultados de pesquisa (Home › Docs › Como criar
 * conta). Melhora CTR e clarifica hierarquia ao crawler.
 *
 * O primeiro item (Início) é gerado automaticamente; só passas os items
 * intermédios e o final. Como usar (server component):
 *
 *   return (
 *     <>
 *       <BreadcrumbList items={[
 *         { name: 'Documentação', path: '/docs' },
 *         { name: 'Como criar conta', path: '/docs/criar-conta' },
 *       ]} />
 *       <PageContent />
 *     </>
 *   );
 */
export default function BreadcrumbList({ items }: { items: BreadcrumbItem[] }) {
  const schema: BreadcrumbListSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: { '@id': `${SITE_URL}/`, name: 'Início' },
      },
      ...items.map((item, idx) => ({
        '@type': 'ListItem' as const,
        position: idx + 2,
        item: {
          '@id': `${SITE_URL}${item.path}`,
          name: item.name,
        },
      })),
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
