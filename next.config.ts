import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Prevent Turbopack from bundling native Node modules used server-side.
  // Without this, Turbopack mangles package names (e.g. "pg-{hash}") and
  // throws ERR_MODULE_NOT_FOUND at runtime.
  serverExternalPackages: ["pg", "pg-native", "@prisma/client", "prisma"],
};

export default nextConfig;
