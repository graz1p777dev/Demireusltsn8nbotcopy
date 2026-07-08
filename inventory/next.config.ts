import type { NextConfig } from "next";

// Deployed as a Next.js Multi-Zone under the CRM domain at /inventory.
// The CRM (default zone) rewrites /inventory, /inventory/* and /inventory-static/*
// to this app's deployment. assetPrefix keeps this zone's _next assets from
// colliding with the CRM's assets.
const nextConfig: NextConfig = {
  assetPrefix: "/inventory-static",
  experimental: {
    // The browser-facing origin is the CRM domain, not this deployment's URL,
    // so Server Actions must explicitly trust it.
    serverActions: {
      allowedOrigins: ["demiresults.alihan-torebekov.kg"],
    },
  },
};

export default nextConfig;
