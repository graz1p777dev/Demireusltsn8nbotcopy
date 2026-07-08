"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createWarehouse } from "@/app/inventory/cash-shifts/actions"
import type { WarehouseOption } from "@/app/inventory/cash-shifts/actions"

interface WarehouseCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (warehouse: WarehouseOption) => void
}

export function WarehouseCreateDialog({ open, onOpenChange, onCreated }: WarehouseCreateDialogProps) {
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createWarehouse({ name, address: address.trim() || null })
      if (!result.success) {
        setError(result.error)
        return
      }
      onCreated(result.warehouse)
      setName("")
      setAddress("")
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый магазин</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-name">Название</Label>
            <Input id="warehouse-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="warehouse-address">Адрес</Label>
            <Input id="warehouse-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
