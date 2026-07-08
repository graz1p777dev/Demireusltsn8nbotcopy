// Заглушка-данные для фронта раздела "Движение денег" — реальные операции
// появятся, когда подключим модуль к Supabase отдельной задачей.

export interface MoneyOperation {
  id: string
  date: string
  operation: string
  category: string
  account: string
  counterparty: string
  isIncome: boolean
  amount: number
}

export const MONEY_ACCOUNTS = ["Касса 1", "Касса 2", "Расчётный счёт", "MBank · QR-эквайринг"] as const

export const MONEY_CATEGORIES_INCOME = ["Продажи", "Прочий доход"] as const
export const MONEY_CATEGORIES_EXPENSE = [
  "Закупка товара",
  "Аренда",
  "ФОТ",
  "Маркетинг",
  "Перевод",
  "Прочий расход",
] as const

export const INITIAL_MONEY_OPERATIONS: MoneyOperation[] = [
  {
    id: "1",
    date: "07.07.2026 15:34",
    operation: "Выручка кассы №148",
    category: "Продажи",
    account: "Касса 1",
    counterparty: "—",
    isIncome: true,
    amount: 30650,
  },
  {
    id: "2",
    date: "07.07.2026 12:10",
    operation: "Закуп у поставщика",
    category: "Закупка товара",
    account: "Расчётный счёт",
    counterparty: "ОсОО «K-Beauty Import»",
    isIncome: false,
    amount: 128400,
  },
  {
    id: "3",
    date: "06.07.2026 18:40",
    operation: "Аренда помещения",
    category: "Аренда",
    account: "Расчётный счёт",
    counterparty: "ТЦ Bishkek Park",
    isIncome: false,
    amount: 55000,
  },
  {
    id: "4",
    date: "06.07.2026 21:15",
    operation: "Выручка кассы №147",
    category: "Продажи",
    account: "Касса 1",
    counterparty: "—",
    isIncome: true,
    amount: 88420,
  },
  {
    id: "5",
    date: "05.07.2026 14:22",
    operation: "Зарплата · аванс",
    category: "ФОТ",
    account: "Расчётный счёт",
    counterparty: "Айгерим Т.",
    isIncome: false,
    amount: 20000,
  },
  {
    id: "6",
    date: "05.07.2026 11:05",
    operation: "Оплата рекламы",
    category: "Маркетинг",
    account: "Расчётный счёт",
    counterparty: "Instagram Ads",
    isIncome: false,
    amount: 12300,
  },
  {
    id: "7",
    date: "04.07.2026 20:50",
    operation: "Выручка кассы №143",
    category: "Продажи",
    account: "Касса 1",
    counterparty: "—",
    isIncome: true,
    amount: 64300,
  },
  {
    id: "8",
    date: "03.07.2026 09:40",
    operation: "Инкассация",
    category: "Перевод",
    account: "Касса 1",
    counterparty: "Расчётный счёт",
    isIncome: false,
    amount: 80000,
  },
]
