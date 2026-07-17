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
  Trash2,
} from "lucide-react"
import type { TranslationKey } from "@/components/inventory/language-provider"

export interface InventoryNavItem {
  href: string
  label: string
  translationKey: TranslationKey
  icon: LucideIcon
  children?: { href: string; label: string; translationKey: TranslationKey }[]
}

export const INVENTORY_NAV_ITEMS: InventoryNavItem[] = [
  { href: "/inventory", label: "Главная", translationKey: "home", icon: Home },
  { href: "/inventory/products", label: "Товары и услуги", translationKey: "products", icon: Package },
  {
    href: "/inventory/cash-shifts",
    label: "Кассы и смены",
    translationKey: "shifts",
    icon: Wallet,
    children: [
      { href: "/inventory/cash-shifts/shifts", label: "Смены", translationKey: "shiftsChild" },
      { href: "/inventory/cash-shifts/registers", label: "Кассы", translationKey: "registers" },
    ],
  },
  { href: "/inventory/stock-movement", label: "Движение товара", translationKey: "stock", icon: ArrowLeftRight },
  { href: "/inventory/money-movement", label: "Движение денег", translationKey: "money", icon: Banknote },
  { href: "/inventory/reports", label: "Отчёты", translationKey: "reports", icon: BarChart3 },
  {
    href: "/inventory/contractors",
    label: "Контрагенты",
    translationKey: "contractors",
    icon: Users,
    children: [
      { href: "/inventory/contractors/suppliers", label: "Поставщики", translationKey: "suppliers" },
      { href: "/inventory/contractors/clients", label: "Клиенты", translationKey: "clients" },
    ],
  },
  {
    href: "/inventory/company",
    label: "Компания",
    translationKey: "company",
    icon: Building2,
    children: [
      { href: "/inventory/company/settings", label: "Настройки", translationKey: "settings" },
      { href: "/inventory/company/employees", label: "Сотрудники", translationKey: "employees" },
      { href: "/inventory/company/stores", label: "Магазины", translationKey: "stores" },
      { href: "/inventory/company/accounts", label: "Счета", translationKey: "accounts" },
    ],
  },
  { href: "/inventory/storefront", label: "Интернет-витрина", translationKey: "storefront", icon: Store },
  { href: "/inventory/trash", label: "Корзина", translationKey: "trash", icon: Trash2 },
]

export function getInventoryPageTitle(pathname: string, translate?: (key: TranslationKey) => string): string {
  for (const item of INVENTORY_NAV_ITEMS) {
    const child = item.children?.find(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/")
    )
    if (child) return translate ? translate(child.translationKey) : child.label

    const parentMatches =
      item.href === "/inventory" ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")
    if (parentMatches) return translate ? translate(item.translationKey) : item.label
  }
  return "Главная"
}
