import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres", "@electric-sql/pglite", "@electric-sql/pglite-socket"],
  // PGlite loads its wasm/data at runtime; make sure they ship with every function.
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/@electric-sql/pglite/dist/pglite.{wasm,data}", "./node_modules/@electric-sql/pglite/dist/initdb.wasm", "./node_modules/@electric-sql/pglite/dist/pgcrypto.tar.gz", "./.pglite/snapshot.tgz"],
  },
  devIndicators: false,
  experimental: {
    // Training files travel as 2MB pieces through server actions (see lib/actions/trainings.ts).
    serverActions: { bodySizeLimit: "3mb" },
    // Revisits within 20s are instant; every mutation still revalidates.
    // No link prefetch and no loading.tsx: see DECISIONS D-16 / D-20.
    staleTimes: { dynamic: 20, static: 30 },
  },
  webpack: (config) => {
    // Migrations are bundled as strings so demo mode can create the schema on Vercel.
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
