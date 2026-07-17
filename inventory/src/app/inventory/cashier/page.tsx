import { redirect } from "next/navigation"

// Касса живёт вне оболочки товароучёта: /cashier.
// Старый адрес оставлен только для совместимости с закладками.
export default function InventoryCashierRedirect() {
  redirect("/cashier")
}
