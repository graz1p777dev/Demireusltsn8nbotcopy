"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { INVENTORY_NAV_ITEMS } from "@/config/inventory-nav"
import { Button } from "@/components/ui/button"
import { CreateDocumentMenu } from "@/components/inventory/documents/create-document-menu"
import { useInventoryLanguage } from "@/components/inventory/language-provider"

function isActive(pathname: string, href: string): boolean {
  if (href === "/inventory") return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

export function InventorySidebar() {
  const pathname = usePathname()
  const { t } = useInventoryLanguage()
  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "sticky top-0 flex h-screen flex-shrink-0 flex-col overflow-hidden bg-[#0c1f33] py-3.5 transition-[width] duration-150 ease-out",
        expanded ? "w-60 px-3" : "w-16 px-2"
      )}
    >
      <div className="flex items-center gap-2.5 px-1.5 pb-3.5">
        <div className="flex size-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#8b6ef7,#6a4df0)] text-base font-extrabold text-white">
          D
        </div>
        <div className={cn("flex min-w-0 flex-col leading-tight transition-opacity duration-150", expanded ? "opacity-100" : "opacity-0")}>
          <span className="text-[15px] font-bold text-white">Demi Results</span>
          <span className="text-[11px] font-medium text-[#6f7699]">CRM & Inventory</span>
        </div>
      </div>

      <CreateDocumentMenu
        trigger={
          <Button className={cn("mb-3 gap-2", expanded ? "w-full justify-center" : "w-10 px-0")} size="default" title={expanded ? undefined : "Создать документ"}>
            <Plus className="size-4" />
            {expanded && t("createDocument")}
          </Button>
        }
      />

      <nav className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-px">
          {INVENTORY_NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            const hasActiveChild = item.children?.some((c) => isActive(pathname, c.href)) ?? false
            const isOpen = expanded && (manuallyOpened.has(item.href) || hasActiveChild)
            const Icon = item.icon

            if (!item.children) {
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-[11px] rounded-md px-2.5 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-[#0c4d6c] text-white font-bold shadow-[0_6px_16px_rgba(12,77,108,.35)]"
                        : "text-[#a2b4c0] font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="size-[17px] flex-shrink-0" />
                    <span className={cn("truncate transition-opacity duration-150", expanded ? "opacity-100" : "opacity-0")}>{t(item.translationKey)}</span>
                  </Link>
                </li>
              )
            }

            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() =>
                    setManuallyOpened((prev) => {
                      const next = new Set(prev)
                      if (next.has(item.href)) next.delete(item.href)
                      else next.add(item.href)
                      return next
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-[11px] rounded-md px-2.5 py-2 text-[13px] transition-colors",
                    hasActiveChild
                      ? "text-white font-semibold"
                      : "text-[#a2b4c0] font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-[17px] flex-shrink-0" />
                  <span className={cn("flex-1 truncate text-left transition-opacity duration-150", expanded ? "opacity-100" : "opacity-0")}>{t(item.translationKey)}</span>
                  <ChevronDown
                    className={cn("size-3.5 flex-shrink-0 transition-all", expanded ? "opacity-100" : "opacity-0", isOpen && "rotate-180")}
                  />
                </button>

                {isOpen && (
                  <ul className="mt-px flex flex-col gap-px pl-[30px]">
                    {item.children.map((child) => {
                      const childActive = isActive(pathname, child.href)
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              "flex items-center gap-[11px] rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                              childActive
                                ? "bg-[#0c4d6c] text-white font-bold shadow-[0_6px_16px_rgba(12,77,108,.35)]"
                                : "text-[#a2b4c0] font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <span className="truncate">{t(child.translationKey)}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

    </aside>
  )
}
