"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Plus, Sparkles, BookOpen, MessageSquareText } from "lucide-react"
import { cn } from "@/lib/utils"
import { INVENTORY_NAV_ITEMS } from "@/config/inventory-nav"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CreateDocumentMenu } from "@/components/inventory/documents/create-document-menu"

function isActive(pathname: string, href: string): boolean {
  if (href === "/inventory") return pathname === href
  return pathname === href || pathname.startsWith(href + "/")
}

const FOOTER_LINKS = [
  { href: "#", label: "Что нового", icon: Sparkles },
  { href: "/inventory/help", label: "База знаний", icon: BookOpen },
  { href: "#", label: "Предложения", icon: MessageSquareText },
]

export function InventorySidebar() {
  const pathname = usePathname()
  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(new Set())

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col bg-sidebar sticky top-0 px-3 py-3.5">
      <div className="flex items-center gap-2.5 px-1.5 pb-3.5">
        <div className="flex size-[38px] flex-shrink-0 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,#8b6ef7,#6a4df0)] text-base font-extrabold text-white">
          D
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-bold text-white">Demi Results</span>
          <span className="text-[11px] font-medium text-[#6f7699]">CRM & Inventory</span>
        </div>
      </div>

      <CreateDocumentMenu
        trigger={
          <Button className="w-full justify-center gap-2 mb-3" size="default">
            <Plus className="size-4" />
            Создать документ
          </Button>
        }
      />

      <nav className="flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-px">
          {INVENTORY_NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            const hasActiveChild = item.children?.some((c) => isActive(pathname, c.href)) ?? false
            const isOpen = manuallyOpened.has(item.href) || hasActiveChild
            const Icon = item.icon

            if (!item.children) {
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-[11px] rounded-md px-2.5 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-[linear-gradient(135deg,#8b6ef7,#6a4df0)] text-white font-bold shadow-[0_6px_16px_rgba(106,77,240,.35)]"
                        : "text-[#a2b4c0] font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="size-[17px] flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
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
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  <ChevronDown
                    className={cn("size-3.5 flex-shrink-0 transition-transform", isOpen && "rotate-180")}
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
                                ? "bg-[linear-gradient(135deg,#8b6ef7,#6a4df0)] text-white font-bold shadow-[0_6px_16px_rgba(106,77,240,.35)]"
                                : "text-[#a2b4c0] font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <span className="truncate">{child.label}</span>
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

      <div className="flex-shrink-0 pt-3">
        <Separator className="mb-2 bg-white/10" />
        <ul className="flex flex-col gap-px">
          {FOOTER_LINKS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center gap-[11px] rounded-md px-2.5 py-2 text-[13px] font-medium text-[#a2b4c0] transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Icon className="size-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
