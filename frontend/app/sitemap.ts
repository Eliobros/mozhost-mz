// app/sitemap.ts — gerado dinamicamente pelo Next.js App Router.
// Antes havia um XML estático em public/sitemap.xml com:
//   - datas no futuro (2026) que o Google ignorava
//   - URLs /docs/api AND /docs/apis duplicadas
// Substituímos pelo gerador nativo para evitar ambos os problemas.

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://mozhost.shop'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticUrls: Array<{
    path: string
    changeFrequency: 'weekly' | 'monthly'
    priority: number
  }> = [
    // Top-level
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.5 },

    // Docs index + guias principais
    { path: '/docs', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/docs/faq', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs/precos', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/docs/criar-conta', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs/primeiro-container', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs/bots', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs/api', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/docs/cli', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs/cli/deploy', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/cli/create-database', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/criar-database', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/comprar-coins', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/docs/dominio', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/email-service', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/exemplos', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/suporte', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/docs/variaveis', changeFrequency: 'weekly', priority: 0.6 },

    // Contacto
    { path: '/contato', changeFrequency: 'monthly', priority: 0.7 },
  ]

  return staticUrls.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
