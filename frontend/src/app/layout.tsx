import type { Metadata } from "next";
import "./globals.css";
import { CopilotPageContextProvider } from "@/lib/copilot-context";

export const metadata: Metadata = {
  title: "Demi Results CRM",
  description: "Панель управления AI-ботом",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <CopilotPageContextProvider>{children}</CopilotPageContextProvider>
      </body>
    </html>
  );
}
