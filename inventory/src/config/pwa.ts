// Shared PWA branding constants for the товароучёт (/inventory) and кассир (/cashier)
// zones. Mirrors the theme colors defined in src/app/globals.css so the manifest
// and the app UI never drift apart.
export const PWA_THEME_COLOR = "#0c4d6c" // var(--brand-violet-2) / var(--primary)
export const PWA_BACKGROUND_COLOR = "#f4f7f8" // var(--brand-app-bg)

export const PWA_ICONS = [
  { src: "/inventory-static/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/inventory-static/icons/icon-512.png", sizes: "512x512", type: "image/png" },
]
