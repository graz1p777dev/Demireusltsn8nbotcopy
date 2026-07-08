"use client"

import { Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ContractorsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  placeholder: string
  createLabel: string
  onCreate: () => void
}

export function ContractorsToolbar({ search, onSearchChange, placeholder, createLabel, onCreate }: ContractorsToolbarProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative max-w-[340px] flex-1">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      <div className="flex-1" />
      <Button className="gap-1.5" onClick={onCreate}>
        <Plus className="size-4" />
        {createLabel}
      </Button>
    </div>
  )
}
