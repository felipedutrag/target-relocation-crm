import type { NextConfig } from "next";

const CANONICAL = "https://targetrelocation.com.br";
const RAILWAY_HOST = "target-relocation-crm-production.up.railway.app";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // www -> dominio canonico (consolida SEO)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.targetrelocation.com.br" }],
        destination: `${CANONICAL}/:path*`,
        permanent: true,
      },
      // Dominio do Railway -> dominio canonico (APIs MCP/OAuth continuam acessiveis)
      {
        source: "/:path((?!api/|oauth/|\\.well-known/|_next/).*)",
        has: [{ type: "host", value: RAILWAY_HOST }],
        destination: `${CANONICAL}/:path`,
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // Nunca indexar o dominio tecnico do Railway
      {
        source: "/:path*",
        has: [{ type: "host", value: RAILWAY_HOST }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;