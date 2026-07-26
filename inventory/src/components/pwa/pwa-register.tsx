"use client"

import { useEffect } from "react"

// Minimal service worker registration to make a route installable as a PWA.
// No offline caching logic — the worker just passes fetches through.
export function PwaRegister({ swUrl, scope }: { swUrl: string; scope: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => {})
  }, [swUrl, scope])

  return null
}
