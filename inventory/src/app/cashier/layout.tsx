import type { Metadata, Viewport } from "next"
import { PwaRegister } from "@/components/pwa/pwa-register"
import { PWA_THEME_COLOR } from "@/config/pwa"

export const metadata: Metadata = {
  manifest: "/cashier/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
}

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PwaRegister swUrl="/cashier/sw.js" scope="/cashier" />
      {children}
    </>
  )
}
