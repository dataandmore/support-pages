import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Prevent Turbopack from bundling native Node modules used server-side.
  // Without this, Turbopack mangles package names (e.g. "pg-{hash}") and
  // throws ERR_MODULE_NOT_FOUND at runtime.
  serverExternalPackages: ["pg", "pg-native", "@prisma/client", "prisma"],

  // Rewrite legacy HubSpot image paths to the proxy API route.
  // Articles imported from HubSpot reference /hs-fs/hubfs/… which now 404
  // since the domain points to Next.js instead of HubSpot.
  async rewrites() {
    return [
      {
        source: "/hubfs/:path*",
        destination: "/api/hubspot-img/:path*",
      },
      {
        source: "/hs-fs/hubfs/:path*",
        destination: "/api/hubspot-img/:path*",
      },
    ];
  },
};

export default nextConfig;
