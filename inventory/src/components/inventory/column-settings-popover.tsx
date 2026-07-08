"use client"

import { Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ColumnDef } from "@/lib/use-column-visibility"

interface ColumnSettingsPopoverProps {
  columnDefs: ColumnDef[]
  visibility: Record<string, boolean>
  onToggle: (key: string) => void
}

export function ColumnSettingsPopover({ columnDefs, visibility, onToggle }: ColumnSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Настройки таблицы">
            <Settings2 className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <p className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Видимые колонки
        </p>
        <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {columnDefs.map((col) => {
            const checked = visibility[col.key] ?? col.defaultVisible
            return (
              <div
                key={col.key}
                className="flex items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-muted/50"
              >
                {/*
                  Checkbox и Label — соседние элементы без htmlFor: у Base UI
                  скрытый нативный инпут порталится вне дерева поповера, и клик
                  по связанному label закрывает поповер как "клик снаружи".
                */}
                <Checkbox checked={checked} onCheckedChange={() => onToggle(col.key)} />
                <Label className="flex-1 cursor-pointer text-[13px] font-normal" onClick={() => onToggle(col.key)}>
                  {col.label}
                </Label>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
