import { getDocumentsListData, getDocumentFormData } from "./actions"
import { DocumentsPageClient } from "@/components/inventory/documents/documents-page-client"

export default async function StockMovementPage() {
  const [documents, formData] = await Promise.all([getDocumentsListData(), getDocumentFormData()])

  return <DocumentsPageClient documents={documents} formData={formData} />
}
