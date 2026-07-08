"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { BarChart2, MessageSquare, Settings, CalendarCheck, Sun, Moon, FileBarChart2, Menu, Boxes, FlaskConical, HelpCircle, type LucideIcon } from "lucide-react";
import { LiveClockWidget, LogoutButton } from "@/components/dashboard";

type NavItem = { href: string; label: string; icon: LucideIcon; color: string; external?: boolean };

const NAV_SECTIONS: { main: NavItem[]; admin: NavItem[] } = {
  main: [
    { href: "/", label: "Диалоги", icon: MessageSquare, color: "#6366F1" },
  ],
  admin: [
    { href: "/analytics", label: "Аналитика", icon: BarChart2, color: "#14B8A6" },
    { href: "/reports", label: "Отчёты", icon: FileBarChart2, color: "#0EA5E9" },
    { href: "/consultations", label: "Консультации", icon: CalendarCheck, color: "#F59E0B" },
    { href: "/laboratory", label: "Лаборатория", icon: FlaskConical, color: "#EC4899" },
    // Cross-zone link to the separate inventory app — must be a plain <a>, not <Link>.
    { href: "/inventory", label: "Товароучёт", icon: Boxes, color: "#8B5CF6", external: true },
    { href: "/settings", label: "Настройки", icon: Settings, color: "#64748B" },
    { href: "/help", label: "Справочник", icon: HelpCircle, color: "#22C55E" },
  ],
};

function NavLink({ item, path }: { item: NavItem; path: string }) {
  const active = !item.external && path === item.href;
  const Tag = item.external ? "a" : Link;
  return (
    <Tag href={item.href} className={active ? "active" : ""} style={{ "--item-color": item.color } as CSSProperties}>
      <span className="nav-icon">
        <item.icon size={15} />
      </span>
      <span className="nav-label">{item.label}</span>
    </Tag>
  );
}

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
            <span className="brand-name nav-label">Demi Results</span>
          </div>
          <span className="brand-sub nav-label">CRM Bot v2</span>
        </div>

        <nav className="nav">
          <span className="nav-section nav-label">Основное</span>
          {NAV_SECTIONS.main.map(item => <NavLink key={item.href} item={item} path={path} />)}
          <span className="nav-section nav-label">Администрирование</span>
          {NAV_SECTIONS.admin.map(item => <NavLink key={item.href} item={item} path={path} />)}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot">
            <span className="dot" />
            <span className="nav-label">Railway online</span>
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
