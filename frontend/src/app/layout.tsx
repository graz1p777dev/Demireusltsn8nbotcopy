import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Demi Results AI Bot",
  description: "Admin panel for the Demi Results amoCRM AI assistant",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}

