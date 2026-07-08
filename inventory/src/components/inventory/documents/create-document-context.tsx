"use client"

import { createContext, useContext, useState, useCallback } from "react"
import type { InventoryDocType } from "@/config/document-types"

interface CreateDocumentContextValue {
  openCreate: (docType: InventoryDocType) => void
}

const CreateDocumentContext = createContext<CreateDocumentContextValue | null>(null)

export function useCreateDocument(): CreateDocumentContextValue {
  const ctx = useContext(CreateDocumentContext)
  if (!ctx) {
    throw new Error("useCreateDocument must be used within CreateDocumentProvider")
  }
  return ctx
}

// Внутренний хук — используется только DocumentCreationProvider-обёрткой в layout,
// чтобы не плодить ещё один контекст только ради одного состояния.
export function useCreateDocumentInternalState() {
  const [request, setRequest] = useState<{ docType: InventoryDocType; token: number } | null>(null)
  const [open, setOpen] = useState(false)

  const openCreate = useCallback((docType: InventoryDocType) => {
    setRequest((prev) => ({ docType, token: (prev?.token ?? 0) + 1 }))
    setOpen(true)
  }, [])

  return { request, open, setOpen, openCreate }
}

export { CreateDocumentContext }
