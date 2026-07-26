import { NextResponse } from "next/server"
import { PWA_BACKGROUND_COLOR, PWA_ICONS, PWA_THEME_COLOR } from "@/config/pwa"

// Served at /cashier/manifest.webmanifest. Separate from the /inventory
// manifest since кассир is a sibling zone with its own start_url/scope.
export async function GET() {
  return NextResponse.json(
    {
      name: "Demi Results — Касса",
      short_name: "Касса",
      description: "Интерфейс кассира Demi Results OS",
      start_url: "/cashier",
      scope: "/cashier",
      display: "standalone",
      background_color: PWA_BACKGROUND_COLOR,
      theme_color: PWA_THEME_COLOR,
      icons: PWA_ICONS,
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  )
}
