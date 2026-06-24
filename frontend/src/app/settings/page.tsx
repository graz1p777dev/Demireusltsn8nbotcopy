import { UsersPanel, PromptPanel, SectionShell } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";
import { Users, Bot } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell title="Настройки" subtitle="Пользователи CRM · Промпт бота">
      <SectionShell id="prompt" title="Промпт бота" icon={<Bot size={14} />}>
        <PromptPanel />
      </SectionShell>
      <SectionShell id="users" title="Пользователи CRM" icon={<Users size={14} />}>
        <UsersPanel />
      </SectionShell>
    </AppShell>
  );
}
