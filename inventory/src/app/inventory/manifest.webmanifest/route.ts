import { NextResponse } from "next/server"
import { PWA_BACKGROUND_COLOR, PWA_ICONS, PWA_THEME_COLOR } from "@/config/pwa"

// Served at /inventory/manifest.webmanifest. Kept as its own route (rather than
// the root app/manifest.ts convention) because /inventory and /cashier are
// sibling zones on the same domain and each needs its own scope/start_url.
export async function GET() {
  return NextResponse.json(
    {
      name: "Demi Inventory — Товароучёт",
      short_name: "Товароучёт",
      description: "Складской модуль Demi Results OS",
      start_url: "/inventory",
      scope: "/inventory",
      display: "standalone",
      background_color: PWA_BACKGROUND_COLOR,
      theme_color: PWA_THEME_COLOR,
      icons: PWA_ICONS,
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  )
}
