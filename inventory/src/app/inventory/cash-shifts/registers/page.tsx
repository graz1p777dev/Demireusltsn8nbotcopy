import { getRegistersPageData } from "@/app/inventory/cash-shifts/actions"
import { RegistersPageClient } from "@/components/inventory/cash-shifts/registers-page-client"

export default async function RegistersPage() {
  const initialData = await getRegistersPageData()

  return <RegistersPageClient initialData={initialData} />
}
