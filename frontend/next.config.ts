import type { NextConfig } from 'next'
import withPWA from 'next-pwa'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['109.199.126.125'],
  turbopack: {},
  // Habilita image optimization (Core Web Vitals — fator direto de ranking).
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Não esconda erros TS durante build (foi removido para detectar problemas reais).
  typescript: {
    ignoreBuildErrors: false,
  },
  // Não vaza o header "X-Powered-By: Next.js" (sinal de segurança fraco).
  poweredByHeader: false,
  // Compressão gzip/brotli de respostas — melhor LCP.
  compress: true,
}

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig as any)
