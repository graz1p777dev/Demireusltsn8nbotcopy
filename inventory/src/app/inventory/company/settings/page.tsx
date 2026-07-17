import { CompanySettingsClient } from "@/components/inventory/company/company-settings-client"
import { getCompanySettings } from "@/app/inventory/company/actions"

export default async function Page() {
  return <CompanySettingsClient initialSettings={await getCompanySettings()} />
}
