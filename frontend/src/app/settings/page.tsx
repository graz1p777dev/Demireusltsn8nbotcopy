import { UsersPanel, PromptPanel, ManagersPanel, SectionShell } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";
import { Users, Bot, MessageCircle } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell title="Настройки" subtitle="Пользователи CRM · Промпт бота · Менеджеры Telegram">
      <SectionShell id="prompt" title="Промпт бота" icon={<Bot size={14} />}>
        <PromptPanel />
      </SectionShell>
      <SectionShell id="managers" title="Менеджеры Telegram" icon={<MessageCircle size={14} />}>
        <ManagersPanel />
      </SectionShell>
      <SectionShell id="users" title="Пользователи CRM" icon={<Users size={14} />}>
        <UsersPanel />
      </SectionShell>
    </AppShell>
  );
}
