import { KpiCard } from "@/components/inventory/dashboard/kpi-card"
import { RevenueChart } from "@/components/inventory/dashboard/revenue-chart"
import { CategoryDonut } from "@/components/inventory/dashboard/category-donut"
import { DocumentsTable } from "@/components/inventory/dashboard/documents-table"
import { StockEstimate } from "@/components/inventory/dashboard/stock-estimate"
import { KPI_MOCK } from "@/app/inventory/_data/mock-dashboard"

export default function InventoryHomePage() {
  return (
    <div className="flex flex-col gap-[14px]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_MOCK.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.9fr_1.3fr]">
        <RevenueChart />
        <CategoryDonut />
      </div>

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1.85fr_1fr]">
        <DocumentsTable />
        <StockEstimate />
      </div>
    </div>
  )
}
