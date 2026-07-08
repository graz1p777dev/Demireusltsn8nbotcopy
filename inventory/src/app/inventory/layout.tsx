import { InventorySidebar } from "@/components/inventory/sidebar"
import { InventoryTopbar } from "@/components/inventory/topbar"
import { DocumentCreationProvider } from "@/components/inventory/documents/document-creation-provider"
import { getDocumentFormData } from "@/app/inventory/stock-movement/actions"

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const documentFormData = await getDocumentFormData()

  return (
    <DocumentCreationProvider formData={documentFormData}>
      <div className="flex min-h-screen">
        <InventorySidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <InventoryTopbar />
          <main className="flex-1 overflow-y-auto bg-background px-5 py-[18px]">{children}</main>
        </div>
      </div>
    </DocumentCreationProvider>
  )
}
