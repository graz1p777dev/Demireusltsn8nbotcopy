"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CURRENCIES = ["Сом (KGS)", "Рубль (RUB)", "Доллар (USD)"] as const
const TIMEZONES = ["GMT+6 · Бишкек", "GMT+3 · Москва", "GMT+5 · Ташкент"] as const

export function CompanySettingsClient() {
  const [name, setName] = useState("ОсОО «Demi Beauty»")
  const [inn, setInn] = useState("02508201910123")
  const [director, setDirector] = useState("Джолдошев С. К.")
  const [phone, setPhone] = useState("+996 555 00-11-22")
  const [address, setAddress] = useState("г. Бишкек, пр. Чуй 154")
  const [currency, setCurrency] = useState<string>(CURRENCIES[0])
  const [timezone, setTimezone] = useState<string>(TIMEZONES[0])

  function handleSave() {
    toast.success("Реквизиты сохранены")
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <Card>
        <CardContent>
          <p className="mb-4 text-sm font-bold">Реквизиты компании</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name">Наименование</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-inn">ИНН</Label>
              <Input id="company-inn" className="font-mono" value={inn} onChange={(e) => setInn(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-director">Директор</Label>
              <Input id="company-director" value={director} onChange={(e) => setDirector(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-phone">Телефон</Label>
              <Input id="company-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="company-address">Юридический адрес</Label>
              <Input id="company-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="mt-5 flex gap-2.5">
            <Button onClick={handleSave}>Сохранить</Button>
            <Button variant="outline">Отмена</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="mb-4 text-sm font-bold">Логотип и валюта</p>
          <button
            type="button"
            onClick={() => toast("Скоро будет доступно")}
            className="flex h-[120px] w-full flex-col items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-dashed border-input text-muted-foreground transition-colors hover:border-ring hover:bg-accent/40"
          >
            <Upload className="size-6" />
            <span className="text-xs font-medium">Загрузить логотип</span>
          </button>

          <div className="mt-4 flex flex-col gap-1.5">
            <Label>Валюта учёта</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{(value: string) => value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3.5 flex flex-col gap-1.5">
            <Label>Часовой пояс</Label>
            <Select value={timezone} onValueChange={(v) => setTimezone(String(v))}>
              <SelectTrigger className="w-full">
                <SelectValue>{(value: string) => value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
