"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type InventoryLocale = "ru" | "ky"

const translations = {
  ru: {
    crm: "CRM", cashier: "Интерфейс кассира", calendar: "Календарь", notifications: "Уведомления", owner: "Владелец", manager: "Управляющий", cashierRole: "Кассир", storekeeper: "Кладовщик", employee: "Сотрудник", createDocument: "Создать документ", home: "Главная", products: "Товары и услуги", shifts: "Кассы и смены", shiftsChild: "Смены", registers: "Кассы", stock: "Движение товара", money: "Движение денег", reports: "Отчёты", contractors: "Контрагенты", suppliers: "Поставщики", clients: "Клиенты", company: "Компания", settings: "Настройки", employees: "Сотрудники", stores: "Магазины", accounts: "Счета", storefront: "Интернет-витрина", trash: "Корзина", language: "Язык интерфейса", russian: "Русский", kyrgyz: "Кыргызча",
  },
  ky: {
    crm: "CRM", cashier: "Кассирдин интерфейси", calendar: "Календарь", notifications: "Билдирмелер", owner: "Ээси", manager: "Башкаруучу", cashierRole: "Кассир", storekeeper: "Кампачы", employee: "Кызматкер", createDocument: "Документ түзүү", home: "Башкы бет", products: "Товарлар жана кызматтар", shifts: "Кассалар жана нөөмөттөр", shiftsChild: "Нөөмөттөр", registers: "Кассалар", stock: "Товардын кыймылы", money: "Акчанын кыймылы", reports: "Отчёттор", contractors: "Контрагенттер", suppliers: "Жеткирүүчүлөр", clients: "Кардарлар", company: "Компания", settings: "Жөндөөлөр", employees: "Кызматкерлер", stores: "Дүкөндөр", accounts: "Эсептер", storefront: "Интернет-витрина", trash: "Себет", language: "Интерфейс тили", russian: "Русский", kyrgyz: "Кыргызча",
  },
} as const

export type TranslationKey = keyof (typeof translations)["ru"]
type LanguageContextValue = { locale: InventoryLocale; setLocale: (locale: InventoryLocale) => void; t: (key: TranslationKey) => string }
const LanguageContext = createContext<LanguageContextValue | null>(null)

export function InventoryLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<InventoryLocale>("ru")
  useEffect(() => {
    const saved = window.localStorage.getItem("inventory-locale")
    if (saved === "ru" || saved === "ky") setLocaleState(saved)
  }, [])
  function setLocale(nextLocale: InventoryLocale) {
    window.localStorage.setItem("inventory-locale", nextLocale)
    document.documentElement.lang = nextLocale
    setLocaleState(nextLocale)
  }
  return <LanguageContext.Provider value={{ locale, setLocale, t: (key) => translations[locale][key] }}>{children}</LanguageContext.Provider>
}

export function useInventoryLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error("useInventoryLanguage must be used inside InventoryLanguageProvider")
  return value
}
