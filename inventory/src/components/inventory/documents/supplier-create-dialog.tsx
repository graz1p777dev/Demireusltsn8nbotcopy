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
import { createSupplier } from "@/app/inventory/stock-movement/actions"
import type { DocumentFormSupplier } from "@/app/inventory/stock-movement/actions"

interface SupplierCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (supplier: DocumentFormSupplier) => void
}

export function SupplierCreateDialog({ open, onOpenChange, onCreated }: SupplierCreateDialogProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createSupplier({
        name,
        phone: phone.trim() || null,
        contact_person: contactPerson.trim() || null,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      onCreated(result.supplier)
      setName("")
      setPhone("")
      setContactPerson("")
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
          <DialogTitle>Новый поставщик</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-name">Название *</Label>
            <Input id="supplier-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-phone">Телефон</Label>
            <Input id="supplier-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-contact">Контактное лицо</Label>
            <Input
              id="supplier-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
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
