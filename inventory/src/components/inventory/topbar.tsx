"use client"

import { usePathname } from "next/navigation"
import { Bell, CalendarDays, ChevronDown, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { getInventoryPageTitle } from "@/config/inventory-nav"

export function InventoryTopbar() {
  const pathname = usePathname()
  const title = getInventoryPageTitle(pathname)

  return (
    <header className="flex h-[62px] flex-shrink-0 items-center justify-between gap-3.5 border-b border-border bg-card px-[26px]">
      <h1 className="text-xl font-extrabold tracking-[-0.3px] text-foreground">{title}</h1>

      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Monitor className="size-3.5 text-primary" />
          Интерфейс кассира
        </Button>

        <div className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold">
          RU
          <ChevronDown className="size-3 text-[#a2b4c0]" />
        </div>

        <Button variant="outline" size="icon" aria-label="Календарь">
          <CalendarDays className="size-4" />
        </Button>

        <Button variant="outline" size="icon" aria-label="Уведомления" className="relative">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full border border-white bg-[#f43f5e]" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2.5">
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg bg-foreground font-bold text-background">
              ВД
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">Владелец Демо</p>
            <p className="text-xs text-muted-foreground">Владелец</p>
          </div>
        </div>
      </div>
    </header>
  )
}
