import { getProductsPageData } from "./actions"
import { ProductsPageClient } from "@/components/inventory/products/products-page-client"

export default async function ProductsPage() {
  const initialData = await getProductsPageData()

  return <ProductsPageClient initialData={initialData} />
}
