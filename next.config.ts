import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "@electric-sql/pglite", "@electric-sql/pglite-socket"],
  // PGlite loads its wasm/data at runtime; make sure they ship with every function.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@electric-sql/pglite/dist/pglite.{wasm,data}", "./node_modules/@electric-sql/pglite/dist/initdb.wasm", "./node_modules/@electric-sql/pglite/dist/pgcrypto.tar.gz"],
  },
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  webpack: (config) => {
    // Migrations are bundled as strings so demo mode can create the schema on Vercel.
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
