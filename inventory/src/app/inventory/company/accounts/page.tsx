import { AccountsPageClient } from "@/components/inventory/company/accounts-page-client"
import { getCompanyAccounts } from "@/app/inventory/company/actions"

export default async function Page() {
  return <AccountsPageClient initialAccounts={await getCompanyAccounts()} />
}
