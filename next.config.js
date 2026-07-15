/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não gera source maps no navegador em produção: o bundle vai minificado e
  // sem o "mapa" que deixaria remontar o código legível.
  productionBrowserSourceMaps: false,
  // Remove o header que anuncia "Next.js" e os console.* em produção.
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

module.exports = nextConfig;
