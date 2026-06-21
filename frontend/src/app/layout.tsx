import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demi Results CRM",
  description: "Панель управления AI-ботом",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
