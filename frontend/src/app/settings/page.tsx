import { UsersPanel, PromptPanel, ManagersPanel, AiTestPanel, ChangelogPanel, TemplatesPanel, StopWordsPanel, SectionShell } from "@/components/dashboard";
import { AppShell } from "@/components/app-shell";
import { Users, Bot, MessageCircle, FlaskConical, ScrollText, BookOpen, ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell title="Настройки" subtitle="Пользователи CRM · Промпт бота · Менеджеры Telegram">
      <SectionShell id="ai-test" title="Тест ИИ бота" icon={<FlaskConical size={14} />}>
        <AiTestPanel />
      </SectionShell>
      <SectionShell id="prompt" title="Промпт бота" icon={<Bot size={14} />}>
        <PromptPanel />
      </SectionShell>
      <SectionShell id="templates" title="Шаблоны ответов" icon={<BookOpen size={14} />}>
        <TemplatesPanel />
      </SectionShell>
      <SectionShell id="stop-words" title="Стоп-слова" icon={<ShieldAlert size={14} />}>
        <StopWordsPanel />
      </SectionShell>
      <SectionShell id="managers" title="Менеджеры Telegram" icon={<MessageCircle size={14} />}>
        <ManagersPanel />
      </SectionShell>
      <SectionShell id="users" title="Пользователи CRM" icon={<Users size={14} />}>
        <UsersPanel />
      </SectionShell>
      <SectionShell id="changelog" title="История изменений" icon={<ScrollText size={14} />} defaultOpen={false}>
        <ChangelogPanel />
      </SectionShell>
    </AppShell>
  );
}
