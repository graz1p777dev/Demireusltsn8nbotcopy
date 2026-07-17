"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, CalendarDays, ChevronDown, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { getInventoryPageTitle } from "@/config/inventory-nav"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useInventoryLanguage } from "@/components/inventory/language-provider"

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "П"
}

export function InventoryTopbar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname()
  const { locale, setLocale, t } = useInventoryLanguage()
  const title = getInventoryPageTitle(pathname, t)
  const roleLabels: Record<string, string> = { owner: t("owner"), manager: t("manager"), cashier: t("cashierRole"), storekeeper: t("storekeeper") }

  return (
    <header className="flex h-[62px] flex-shrink-0 items-center justify-between gap-3.5 border-b border-border bg-card px-[26px]">
      <h1 className="text-xl font-extrabold tracking-[-0.3px] text-foreground">{title}</h1>

      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="sm" render={<a href="/dashboard" />}>
          {t("crm")}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" render={<a href="/cashier" />}>
          <Monitor className="size-3.5 text-primary" />
          {t("cashier")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            {locale.toUpperCase()}<ChevronDown className="size-3 text-[#a2b4c0]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as "ru" | "ky")}>
              <DropdownMenuRadioItem value="ru">{t("russian")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ky">{t("kyrgyz")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="icon" aria-label={t("calendar")}>
          <CalendarDays className="size-4" />
        </Button>

        <Button variant="outline" size="icon" aria-label={t("notifications")} className="relative">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full border border-white bg-[#f43f5e]" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2.5">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-foreground font-bold text-background">
              {initials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{roleLabels[role] ?? t("employee")}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
