const SW_SCRIPT = `// Minimal service worker: no offline caching, just enough for PWA installability.
self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request))
})
`

// Served at /cashier/sw.js. Service-Worker-Allowed widens the default scope
// (which would otherwise be limited to "/cashier/") to cover "/cashier"
// itself, matching the manifest's scope/start_url.
export async function GET() {
  return new Response(SW_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/cashier",
      "Cache-Control": "no-cache",
    },
  })
}
