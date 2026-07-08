// Заглушка-данные для фронта раздела "Контрагенты" — реальные записи
// появятся, когда подключим модуль к Supabase отдельной задачей.

export interface SupplierRow {
  id: string
  name: string
  contact: string
  phone: string
  debt: number
  lastPurchase: string
}

export const INITIAL_SUPPLIERS: SupplierRow[] = [
  { id: "1", name: "ОсОО «K-Beauty Import»", contact: "Ким Джису", phone: "+996 555 12-34-56", debt: 128400, lastPurchase: "7 июл" },
  { id: "2", name: "Cliv Kyrgyzstan", contact: "Асель Б.", phone: "+996 700 88-11-22", debt: 0, lastPurchase: "2 июл" },
  { id: "3", name: "Seoul Cosmetics Ltd", contact: "Park Minho", phone: "+82 10 4455-8899", debt: 54200, lastPurchase: "28 июн" },
  { id: "4", name: "Anua Distribution", contact: "Нургуль Т.", phone: "+996 555 77-00-33", debt: 0, lastPurchase: "20 июн" },
  { id: "5", name: "Round Lab KG", contact: "Данияр С.", phone: "+996 770 45-67-89", debt: 12800, lastPurchase: "15 июн" },
]

export interface ClientRow {
  id: string
  name: string
  phone: string
  sales: number
  total: number
  discount: number
  lastVisit: string
}

export const INITIAL_CLIENTS: ClientRow[] = [
  { id: "1", name: "Розничный покупатель", phone: "—", sales: 1284, total: 2400000, discount: 0, lastVisit: "сегодня" },
  { id: "2", name: "Айнура М.", phone: "+996 555 33-22-11", sales: 46, total: 184200, discount: 5, lastVisit: "сегодня" },
  { id: "3", name: "Салон «Lotus»", phone: "+996 700 55-66-77", sales: 38, total: 312500, discount: 12, lastVisit: "6 июл" },
  { id: "4", name: "Гульмира К.", phone: "+996 770 12-00-99", sales: 21, total: 96400, discount: 5, lastVisit: "5 июл" },
  { id: "5", name: "Бейбарыс Э.", phone: "+996 555 90-80-70", sales: 12, total: 44100, discount: 0, lastVisit: "1 июл" },
]
