import { Bot, Clock, MessageSquare, Settings } from "lucide-react";
import { apiGet, Conversation } from "@/lib/api";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  const conversations = await apiGet<Conversation[]>("/admin/conversations").catch(() => []);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Demi Results AI</div>
        <nav className="nav">
          <a href="#dialogs"><MessageSquare size={16} /> Диалоги</a>
          <a href="#actions"><Clock size={16} /> Действия бота</a>
          <a href="#ai"><Bot size={16} /> AI управление</a>
          <a href="#settings"><Settings size={16} /> Настройки</a>
        </nav>
      </aside>
      <main className="main">
        <div className="toolbar">
          <div className="title">
            <h1>Админ-панель amoCRM бота</h1>
            <p>Диалоги, память клиента, extracted fields, ошибки интеграций и ручная отправка.</p>
          </div>
          <span className="pill">Production backend</span>
        </div>
        <Dashboard initialConversations={conversations} />
      </main>
    </div>
  );
}

