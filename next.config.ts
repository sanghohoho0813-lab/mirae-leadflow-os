import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  devIndicators: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  webpack: (config) => {
    // Migrations are bundled as strings so demo mode can create the schema on Vercel.
    config.module.rules.push({ test: /\.sql$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
