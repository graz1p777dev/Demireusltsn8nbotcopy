import { getShiftsPageData } from "@/app/inventory/cash-shifts/actions"
import { ShiftsPageClient } from "@/components/inventory/cash-shifts/shifts-page-client"

export default async function ShiftsPage() {
  const initialData = await getShiftsPageData()

  return <ShiftsPageClient initialData={initialData} />
}
