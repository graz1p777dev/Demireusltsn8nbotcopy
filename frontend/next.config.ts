import type { NextConfig } from "next";

// The inventory (товароучёт) module is a separate Next.js app deployed as its
// own Vercel project. It is served under /inventory on this domain via
// Multi-Zones rewrites. INVENTORY_URL must point to that deployment, e.g.
// https://demi-inventory.vercel.app (no trailing slash).
const inventoryUrl = process.env.INVENTORY_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!inventoryUrl) return [];
    return [
      { source: "/inventory", destination: `${inventoryUrl}/inventory` },
      { source: "/inventory/:path+", destination: `${inventoryUrl}/inventory/:path+` },
      { source: "/inventory-static/:path+", destination: `${inventoryUrl}/inventory-static/:path+` },
    ];
  },
};

export default nextConfig;
