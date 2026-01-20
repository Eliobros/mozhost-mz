/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRÍTICO: Electron precisa de static export
  output: 'export',
  
  // Desabilita otimização de imagens
  images: {
    unoptimized: true,
  },
  
  // Se usa variáveis de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.topaziocoin.online',
  },
  
  // Trailing slash (compatibilidade Electron)
  trailingSlash: true,
};

module.exports = nextConfig;
