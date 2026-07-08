"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmployeeCreateDialog } from "./employee-create-dialog"
import { INITIAL_EMPLOYEES, ROLE_DOT, ROLE_LABELS } from "./company-mock-data"
import type { EmployeeRow, RoleKey } from "./company-mock-data"

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function EmployeesPageClient() {
  const [employees, setEmployees] = useState<EmployeeRow[]>(INITIAL_EMPLOYEES)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleCreate(fields: { name: string; role: RoleKey; store: string }) {
    setEmployees((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: fields.name, role: fields.role, store: fields.store, initials: initials(fields.name) },
    ])
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Добавить сотрудника
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex flex-row items-center gap-3.5">
              <span className="flex size-[46px] flex-shrink-0 items-center justify-center rounded-xl bg-sidebar text-base font-semibold text-sidebar-foreground">
                {e.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{e.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{e.store}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] font-semibold text-foreground/70">
                  <span className="size-1.5 rounded-full" style={{ background: ROLE_DOT[e.role] }} />
                  {ROLE_LABELS[e.role]}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EmployeeCreateDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </div>
  )
}
