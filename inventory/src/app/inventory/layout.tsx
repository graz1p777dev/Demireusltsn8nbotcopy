import type { Metadata, Viewport } from "next"
import { InventorySidebar } from "@/components/inventory/sidebar"
import { InventoryTopbar } from "@/components/inventory/topbar"
import { DocumentCreationProvider } from "@/components/inventory/documents/document-creation-provider"
import { getDocumentFormData } from "@/app/inventory/stock-movement/actions"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InventoryLanguageProvider } from "@/components/inventory/language-provider"
import { PwaRegister } from "@/components/pwa/pwa-register"
import { PWA_THEME_COLOR } from "@/config/pwa"

export const metadata: Metadata = {
  manifest: "/inventory/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
}

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const documentFormData = await getDocumentFormData()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: employee } = user
    ? await supabase.from("employees").select("name, role").eq("user_id", user.id).is("deleted_at", null).maybeSingle()
    : { data: null }
  const userName = employee?.name ?? user?.email ?? "Пользователь"

  // Второй барьер: даже если Inventory открыть напрямую, кассир не увидит его разделы.
  if (employee?.role === "cashier") redirect("/cashier")

  return (
    <InventoryLanguageProvider>
    <DocumentCreationProvider formData={documentFormData}>
      <PwaRegister swUrl="/inventory/sw.js" scope="/inventory" />
      <div className="flex min-h-screen">
        <InventorySidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <InventoryTopbar userName={userName} role={employee?.role ?? ""} />
          <main className="inventory-page-enter flex-1 overflow-y-auto bg-background px-5 py-[18px]">{children}</main>
        </div>
      </div>
    </DocumentCreationProvider>
    </InventoryLanguageProvider>
  )
}
