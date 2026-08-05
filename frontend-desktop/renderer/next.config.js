/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRÍTICO: Electron precisa de static export
  output: 'export',

  // Nextron: em produção, exporta para ../app (o nextron usa esse dir)
  distDir:
    process.env.NODE_ENV === 'production'
      ? '../app'
      : '.next',
  
  // Desabilita otimização de imagens
  images: {
    unoptimized: true,
  },
  
  // Se usa variáveis de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop',
  },
  
  // Trailing slash (compatibilidade Electron)
  trailingSlash: true,
};

module.exports = nextConfig;
