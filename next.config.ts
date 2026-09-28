import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "@electric-sql/pglite", "@electric-sql/pglite-socket"],
  // PGlite loads its wasm/data at runtime; make sure they ship with every function.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@electric-sql/pglite/dist/pglite.{wasm,data}", "./node_modules/@electric-sql/pglite/dist/initdb.wasm", "./node_modules/@electric-sql/pglite/dist/pgcrypto.tar.gz"],
  },
  devIndicators: false,
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
    // Tabs are prefetched (full data, reused ≤30s) and revisits within 20s are
    // instant; every mutation still revalidates. No loading.tsx: see DECISIONS D-16.
    staleTimes: { dynamic: 20, static: 30 },
  },
  webpack: (config) => {
    // Migrations are bundled as strings so demo mode can create the schema on Vercel.
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
