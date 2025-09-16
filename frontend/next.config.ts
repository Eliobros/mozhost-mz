// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚠️ AVISO: Isso vai permitir deploy mesmo com erros de ESLint
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
