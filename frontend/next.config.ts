// next.config.ts (ESM)
const nextConfig = {
  eslint: {
    // ⚠️ AVISO: Isso vai permitir deploy mesmo com erros de ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
