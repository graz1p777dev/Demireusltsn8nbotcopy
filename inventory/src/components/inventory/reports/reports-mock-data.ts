// Заглушка-данные для фронта раздела "Отчёты" — реальная аналитика
// появится, когда подключим модуль к Supabase отдельной задачей.

export interface ReportTypeDef {
  key: "sales" | "stock" | "finance"
  label: string
  desc: string
}

export const REPORT_TYPES: ReportTypeDef[] = [
  { key: "sales", label: "Продажи", desc: "выручка, чеки, кассиры" },
  { key: "stock", label: "Склад", desc: "остатки, оборот, оценка" },
  { key: "finance", label: "Финансы", desc: "прибыль, маржа, ДДС" },
]

export interface ReportDef {
  group: "Продажи" | "Склад" | "Финансы"
  name: string
  desc: string
}

export const REPORTS: ReportDef[] = [
  { group: "Продажи", name: "Выручка по дням", desc: "динамика продаж за период" },
  { group: "Продажи", name: "Продажи по товарам", desc: "топ и аутсайдеры каталога" },
  { group: "Продажи", name: "Продажи по кассирам", desc: "эффективность смен" },
  { group: "Склад", name: "Остатки на складах", desc: "текущие запасы по точкам" },
  { group: "Склад", name: "Оборачиваемость", desc: "скорость продажи товара" },
  { group: "Склад", name: "Низкие остатки", desc: "что пора дозаказать" },
  { group: "Финансы", name: "Прибыль и маржа", desc: "валовая прибыль по товарам" },
  { group: "Финансы", name: "Движение денежных средств", desc: "приход и расход по счетам" },
  { group: "Финансы", name: "Задолженность", desc: "взаиморасчёты с контрагентами" },
]
