"use client"

import { useState } from "react"
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

interface ContractorCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: "supplier" | "client"
  onCreate: (fields: { name: string; contact: string; phone: string }) => void
}

export function ContractorCreateDialog({ open, onOpenChange, kind, onCreate }: ContractorCreateDialogProps) {
  const isSupplier = kind === "supplier"
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName("")
    setContact("")
    setPhone("")
    setError(null)
  }

  function handleSubmit() {
    if (!name.trim()) return setError(isSupplier ? "Укажите название поставщика" : "Укажите имя клиента")
    onCreate({ name: name.trim(), contact: contact.trim(), phone: phone.trim() })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSupplier ? "Новый поставщик" : "Новый клиент"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractor-name">{isSupplier ? "Название" : "Имя"}</Label>
            <Input id="contractor-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          {isSupplier && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contractor-contact">Контактное лицо</Label>
              <Input id="contractor-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractor-phone">Телефон</Label>
            <Input
              id="contractor-phone"
              className="font-mono"
              placeholder="+996 ___ __-__-__"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit}>Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
