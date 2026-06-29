"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart2, Bot, MessageSquare, Settings, CalendarCheck, Sun, Moon, FileBarChart2 } from "lucide-react";
import { LiveClockWidget, LogoutButton } from "@/components/dashboard";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button onClick={toggle} title={dark ? "Светлая тема" : "Тёмная тема"}
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex", alignItems: "center" }}>
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

export function AppShell({ children, title, subtitle }: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const path = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <div className="brand-dot">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="brand-name">Demi Results</span>
          </div>
          <span className="brand-sub">CRM Bot v2</span>
        </div>

        <nav className="nav">
          <span className="nav-section">Основное</span>
          <Link href="/" className={path === "/" ? "active" : ""}>
            <MessageSquare size={15} /> Диалоги
          </Link>
          <span className="nav-section">Администрирование</span>
          <Link href="/analytics" className={path === "/analytics" ? "active" : ""}>
            <BarChart2 size={15} /> Аналитика
          </Link>
          <Link href="/reports" className={path === "/reports" ? "active" : ""}>
            <FileBarChart2 size={15} /> Отчёты
          </Link>
          <Link href="/consultations" className={path === "/consultations" ? "active" : ""}>
            <CalendarCheck size={15} /> Консультации
          </Link>
          <Link href="/settings" className={path === "/settings" ? "active" : ""}>
            <Settings size={15} /> Настройки
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot">
            <span className="dot" />
            <span>Railway online</span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <LiveClockWidget />
            <span className="pill">
              <span className="dot" style={{ width: 6, height: 6 }} />
              Production
            </span>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
