import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* Ship db/custom.db (SQLite schema + data) inside every serverless
   * function bundle so src/lib/db.ts can seed /tmp on cold start.
   * 77KB — negligible bundle cost. */
  outputFileTracingIncludes: {
    "/**": ["./db/custom.db"],
  },
};

export default nextConfig;
