import { getTrashPageData } from "@/app/inventory/products/actions"
import { TrashPageClient } from "@/components/inventory/products/trash-page-client"

export default async function TrashPage() {
  const products = await getTrashPageData()

  return <TrashPageClient initialProducts={products} />
}
