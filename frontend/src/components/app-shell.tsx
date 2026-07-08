"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart2, MessageSquare, Settings, CalendarCheck, Sun, Moon, FileBarChart2, Menu, Boxes } from "lucide-react";
import { LiveClockWidget, LogoutButton } from "@/components/dashboard";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved ? saved === "dark" : true;
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Close sidebar on navigation
  useEffect(() => { setMenuOpen(false); }, [path]);

  return (
    <div className="shell">
      {/* Overlay for mobile sidebar */}
      <div
        className={`sidebar-overlay${menuOpen ? " sidebar-open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">
            <img
              src="/588452014_17953880493043363_6494850109638003503_n.jpg"
              alt="Demi Results"
              style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
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
          {/* Cross-zone link to the separate inventory app — must be a plain <a>, not <Link>. */}
          <a href="/inventory">
            <Boxes size={15} /> Товароучёт
          </a>
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
          <div className="topbar-left" style={{ display: "flex", alignItems: "center" }}>
            <button className="hamburger-btn" onClick={() => setMenuOpen(o => !o)} title="Меню">
              <Menu size={20} />
            </button>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
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
