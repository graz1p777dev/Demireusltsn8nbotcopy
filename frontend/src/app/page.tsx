import { Bot, Clock, MessageSquare, Settings, Users } from "lucide-react";
import { apiGet, Conversation } from "@/lib/api";
import { Dashboard, LiveClockWidget, LogoutButton, UsersPanel } from "@/components/dashboard";

export default async function Home() {
  const conversations = await apiGet<Conversation[]>("/admin/conversations").catch(() => []);

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
          <a href="#dialogs" className="active">
            <MessageSquare size={15} /> Диалоги
          </a>
          <a href="#actions">
            <Clock size={15} /> История
          </a>
          <a href="#ai">
            <Bot size={15} /> AI настройки
          </a>
          <span className="nav-section">Администрирование</span>
          <a href="#users">
            <Users size={15} /> Пользователи
          </a>
          <a href="#settings">
            <Settings size={15} /> Настройки
          </a>
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
            <h1>Панель управления ботом</h1>
            <p>amoCRM диалоги · AI ответы · Telegram карточки</p>
          </div>
          <div className="topbar-right">
            <LiveClockWidget />
            <span className="pill">
              <span className="dot" style={{ width: 6, height: 6 }} />
              Production
            </span>
          </div>
        </div>

        <Dashboard initialConversations={conversations} />
        <UsersPanel />
      </main>
    </div>
  );
}
