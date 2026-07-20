/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem basePath: o bolão e a plataforma são UM projeto só agora.
  // O bolão vive em /bolaodacopa porque os arquivos dele estão em
  // src/app/bolaodacopa, e não por configuração de rota.
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
