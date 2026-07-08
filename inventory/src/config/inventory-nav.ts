import type { LucideIcon } from "lucide-react"
import {
  Home,
  Package,
  Wallet,
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Users,
  Building2,
  Store,
  Plug,
  FlaskConical,
  CreditCard,
  Trash2,
} from "lucide-react"

export interface InventoryNavItem {
  href: string
  label: string
  icon: LucideIcon
  children?: { href: string; label: string }[]
}

export const INVENTORY_NAV_ITEMS: InventoryNavItem[] = [
  { href: "/inventory", label: "Главная", icon: Home },
  { href: "/inventory/products", label: "Товары и услуги", icon: Package },
  {
    href: "/inventory/cash-shifts",
    label: "Кассы и смены",
    icon: Wallet,
    children: [
      { href: "/inventory/cash-shifts/shifts", label: "Смены" },
      { href: "/inventory/cash-shifts/registers", label: "Кассы" },
    ],
  },
  { href: "/inventory/stock-movement", label: "Движение товара", icon: ArrowLeftRight },
  { href: "/inventory/money-movement", label: "Движение денег", icon: Banknote },
  { href: "/inventory/reports", label: "Отчёты", icon: BarChart3 },
  {
    href: "/inventory/contractors",
    label: "Контрагенты",
    icon: Users,
    children: [
      { href: "/inventory/contractors/suppliers", label: "Поставщики" },
      { href: "/inventory/contractors/clients", label: "Клиенты" },
    ],
  },
  {
    href: "/inventory/company",
    label: "Компания",
    icon: Building2,
    children: [
      { href: "/inventory/company/settings", label: "Настройки" },
      { href: "/inventory/company/employees", label: "Сотрудники" },
      { href: "/inventory/company/stores", label: "Магазины" },
      { href: "/inventory/company/accounts", label: "Счета" },
    ],
  },
  { href: "/inventory/storefront", label: "Интернет-витрина", icon: Store },
  { href: "/inventory/integrations", label: "Интеграции", icon: Plug },
  { href: "/inventory/lab", label: "Лаборатория", icon: FlaskConical },
  { href: "/inventory/billing", label: "Тарифы и оплата", icon: CreditCard },
  { href: "/inventory/trash", label: "Корзина", icon: Trash2 },
]

export function getInventoryPageTitle(pathname: string): string {
  for (const item of INVENTORY_NAV_ITEMS) {
    const child = item.children?.find(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/")
    )
    if (child) return child.label

    const parentMatches =
      item.href === "/inventory" ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")
    if (parentMatches) return item.label
  }
  return "Главная"
}
