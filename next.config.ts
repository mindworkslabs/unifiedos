import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2"],
  // Migrations are read at runtime by the embedded dev database.
  outputFileTracingIncludes: { "/**": ["./drizzle/**/*"] },
};

export default nextConfig;
