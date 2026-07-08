"use client"

import { useMemo, useSyncExternalStore } from "react"

export interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
}

// localStorage.setItem() doesn't fire a "storage" event in the tab that made
// the change (only in other tabs) — dispatch one manually so useSyncExternalStore
// re-reads the snapshot and re-renders after a local toggle.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function makeGetSnapshot(storageKey: string) {
  return () => localStorage.getItem(storageKey) ?? ""
}

function getServerSnapshot(): string {
  return ""
}

export function useColumnVisibility(storageKey: string, defs: ColumnDef[]) {
  const raw = useSyncExternalStore(subscribe, makeGetSnapshot(storageKey), getServerSnapshot)

  const overrides = useMemo<Record<string, boolean>>(() => {
    try {
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [raw])

  const visibility = useMemo(
    () => Object.fromEntries(defs.map((d) => [d.key, overrides[d.key] ?? d.defaultVisible])),
    [defs, overrides]
  )

  function toggle(key: string) {
    const current = overrides[key] ?? defs.find((d) => d.key === key)?.defaultVisible ?? true
    const next = { ...overrides, [key]: !current }
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // ignore quota/storage errors
    }
    window.dispatchEvent(new Event("storage"))
  }

  return { visibility, toggle }
}
