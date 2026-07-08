"use client"

import { useRouter } from "next/navigation"
import { CreateDocumentContext, useCreateDocumentInternalState } from "./create-document-context"
import { DocumentSheet } from "./document-sheet"
import type { DocumentFormData } from "@/app/inventory/stock-movement/actions"

interface DocumentCreationProviderProps {
  children: React.ReactNode
  formData: DocumentFormData
}

export function DocumentCreationProvider({ children, formData }: DocumentCreationProviderProps) {
  const { request, open, setOpen, openCreate } = useCreateDocumentInternalState()
  const router = useRouter()

  return (
    <CreateDocumentContext.Provider value={{ openCreate }}>
      {children}
      {request && (
        <DocumentSheet
          key={request.token}
          open={open}
          onOpenChange={setOpen}
          docType={request.docType}
          document={null}
          formData={formData}
          onSaved={() => router.refresh()}
        />
      )}
    </CreateDocumentContext.Provider>
  )
}
