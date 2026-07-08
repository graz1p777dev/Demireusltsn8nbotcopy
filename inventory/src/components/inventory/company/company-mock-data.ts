// Заглушка-данные для фронта раздела "Компания" — реальные записи
// появятся, когда подключим модуль к Supabase отдельной задачей.

export const ROLE_LABELS = {
  owner: "Владелец",
  manager: "Управляющий",
  cashier: "Кассир",
  storekeeper: "Кладовщик",
} as const

export type RoleKey = keyof typeof ROLE_LABELS

export const ROLE_DOT: Record<RoleKey, string> = {
  owner: "#0c4d6c",
  manager: "#0c2136",
  cashier: "#c47a1a",
  storekeeper: "#1f8a5b",
}

export interface EmployeeRow {
  id: string
  name: string
  role: RoleKey
  store: string
  initials: string
}

export const INITIAL_EMPLOYEES: EmployeeRow[] = [
  { id: "1", name: "Самат Джолдошев", role: "owner", store: "Все точки", initials: "СД" },
  { id: "2", name: "Айгерим Токтоева", role: "cashier", store: "Магазин на Чуй", initials: "АТ" },
  { id: "3", name: "Нурзат Касымова", role: "cashier", store: "ТЦ Bishkek Park", initials: "НК" },
  { id: "4", name: "Данияр Осмонов", role: "manager", store: "Все точки", initials: "ДО" },
  { id: "5", name: "Бермет Асанова", role: "storekeeper", store: "Склад", initials: "БА" },
]

export interface StoreRow {
  id: string
  name: string
  address: string
  staff: number
  registers: number
  stockLabel: string
}

export const INITIAL_STORES: StoreRow[] = [
  { id: "1", name: "Магазин на Чуй", address: "пр. Чуй 154, Бишкек", staff: 4, registers: 2, stockLabel: "186 позиций" },
  { id: "2", name: "ТЦ «Bishkek Park»", address: "ул. Киевская 148, 2 этаж", staff: 2, registers: 1, stockLabel: "92 позиции" },
  { id: "3", name: "Центральный склад", address: "ул. Ибраимова 42", staff: 1, registers: 0, stockLabel: "282 позиции" },
]

export interface AccountRow {
  id: string
  name: string
  type: string
  balance: number
  color: string
}

export const INITIAL_ACCOUNTS: AccountRow[] = [
  { id: "1", name: "Касса 1 · наличные", type: "Наличные", balance: 42300, color: "#1f8a5b" },
  { id: "2", name: "Касса 2 · наличные", type: "Наличные", balance: 18750, color: "#1f8a5b" },
  { id: "3", name: "Расчётный счёт", type: "Банк · Optima", balance: 264770, color: "#0c4d6c" },
  { id: "4", name: "MBank · QR-эквайринг", type: "Электронный", balance: 0, color: "#7d8f9b" },
]
