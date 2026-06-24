import { apiGet, Conversation } from "@/lib/api";
import { Dashboard } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";

export default async function Home() {
  const conversations = await apiGet<Conversation[]>("/admin/conversations").catch(() => []);

  return (
    <AppShell title="Панель управления ботом" subtitle="amoCRM диалоги · AI ответы · Telegram карточки">
      <Dashboard initialConversations={conversations} />
    </AppShell>
  );
}
