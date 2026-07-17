import { CashierPageClient } from "@/components/inventory/cashier/cashier-page-client"
import { getProductsPageData } from "@/app/inventory/products/actions"
import { createClient } from "@/lib/supabase/server"

export default async function CashierPage() {
  const data = await getProductsPageData()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: employee } = user
    ? await supabase.from("employees").select("role").eq("user_id", user.id).is("deleted_at", null).maybeSingle()
    : { data: null }
  return <CashierPageClient products={data.products} warehouses={data.warehouses} role={employee?.role ?? ""} />
}
