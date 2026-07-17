"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles, Plus, MessageSquare, Zap, Megaphone, Bug, Send, Trash2, Pencil, Menu, Check, X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { apiGet, apiJson } from "@/lib/api";

type ConversationSummary = { id: number; title: string; updated_at: string };
type ChatButton = { label: string; href: string };
type ChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  buttons: ChatButton[];
  quick_actions: unknown[];
  created_at: string | null;
};
type PendingAction = { id: number; tool_name: string; payload: Record<string, unknown> };

const EXAMPLES = [
  "Как добавить расход?",
  "Покажи продажи за неделю.",
  "Какие товары заканчиваются?",
  "Где посмотреть сотрудников?",
  "Что означает эта ошибка?",
];

const ACTION_TITLES: Record<string, string> = {
  propose_create_expense: "Создать расход?",
  propose_create_consultation: "Забронировать консультацию?",
};

const ACTION_FIELD_LABELS: Record<string, string> = {
  title: "Название", amount: "Сумма", category: "Категория", expense_date: "Дата",
  currency: "Валюта", date: "Дата", time: "Время",
};

function fmtTs(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function ActionCard({ action, onDone }: { action: PendingAction; onDone: (msg: ChatMessage) => void }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Record<string, unknown>>(action.payload);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await apiJson<{ ok: boolean; message: ChatMessage }>(
        `/copilot/actions/${action.id}/confirm`, "POST", editing ? { edits: fields } : {}
      );
      onDone(res.message);
    } catch {
      onDone({
        id: `err-${action.id}`, role: "assistant", buttons: [], quick_actions: [],
        content: "Не удалось выполнить действие. Попробуйте ещё раз.", created_at: null,
      });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try { await apiJson(`/copilot/actions/${action.id}/cancel`, "POST"); } catch { /* noop */ }
    onDone({
      id: `cancel-${action.id}`, role: "assistant", buttons: [], quick_actions: [],
      content: "Действие отменено.", created_at: null,
    });
  };

  return (
    <div className="action-card">
      <div className="action-card-title">{ACTION_TITLES[action.tool_name] || "Подтвердите действие"}</div>
      {Object.entries(fields).filter(([k]) => k !== "currency" || fields.currency).map(([key, value]) => (
        <div className="action-card-row" key={key}>
          <span>{ACTION_FIELD_LABELS[key] || key}</span>
          {editing ? (
            <input
              value={String(value ?? "")}
              onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
              style={{
                background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 6,
                padding: "2px 6px", fontSize: 12, color: "var(--text)", width: 130, textAlign: "right",
              }}
            />
          ) : (
            <b>{String(value)}{key === "amount" && (fields.currency ? ` ${fields.currency}` : "")}</b>
          )}
        </div>
      ))}
      <div className="action-card-actions">
        <button className="btn-primary" disabled={busy} onClick={confirm} style={{ flex: 1 }}>
          <Check size={13} /> {editing ? "Сохранить и подтвердить" : "Подтвердить"}
        </button>
        {!editing && (
          <button className="btn-secondary" disabled={busy} onClick={() => setEditing(true)}>
            <Pencil size={13} />
          </button>
        )}
        <button className="btn-danger" disabled={busy} onClick={cancel}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageContextRef = useRef<{ path: string; extra?: unknown } | null>(null);

  useEffect(() => {
    const path = searchParams.get("context_path");
    if (path) {
      const extraRaw = searchParams.get("context_extra");
      let extra: unknown;
      try { extra = extraRaw ? JSON.parse(extraRaw) : undefined; } catch { extra = undefined; }
      pageContextRef.current = { path, extra };
    }
  }, [searchParams]);

  const loadConversations = useCallback(() => {
    apiGet<ConversationSummary[]>("/copilot/conversations").then(setConversations).catch(() => {});
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pendingAction]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const openConversation = async (id: number) => {
    setRailOpen(false);
    setActiveId(id);
    setPendingAction(null);
    try {
      const data = await apiGet<{ id: number; title: string; messages: ChatMessage[] }>(`/copilot/conversations/${id}`);
      setMessages(data.messages);
    } catch {
      setMessages([]);
    }
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setPendingAction(null);
    setRailOpen(false);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setSending(true);
    const optimisticUser: ChatMessage = {
      id: `local-${Date.now()}`, role: "user", content: trimmed, buttons: [], quick_actions: [], created_at: null,
    };
    setMessages(prev => [...prev, optimisticUser]);

    try {
      const res = await apiJson<{ conversation_id: number; message: ChatMessage; pending_action: PendingAction | null }>(
        "/copilot/chat", "POST",
        { message: trimmed, conversation_id: activeId, page_context: pageContextRef.current },
      );
      pageContextRef.current = null; // only send page context on the first message of a conversation
      setActiveId(res.conversation_id);
      setMessages(prev => [...prev, res.message]);
      setPendingAction(res.pending_action);
      loadConversations();
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: "assistant", buttons: [], quick_actions: [],
        content: "Не удалось получить ответ. Попробуйте ещё раз.", created_at: null,
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const deleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить этот чат?")) return;
    await apiJson(`/copilot/conversations/${id}`, "DELETE").catch(() => {});
    if (activeId === id) startNewChat();
    loadConversations();
  };

  const startRename = (c: ConversationSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(c.id);
    setRenameValue(c.title);
  };

  const saveRename = async (id: number) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    await apiJson(`/copilot/conversations/${id}`, "PATCH", { title }).catch(() => {});
    loadConversations();
  };

  return (
    <AppShell title="ИИ-помощник" subtitle="Copilot для работы с CRM и данными компании">
      <div className="assistant-layout">
        <div className={`sidebar-overlay${railOpen ? " sidebar-open" : ""}`} onClick={() => setRailOpen(false)} />
        <aside className={`assistant-rail${railOpen ? " open" : ""}`}>
          <div className="assistant-rail-section">
            <button className="btn-primary" style={{ width: "100%" }} onClick={startNewChat}>
              <Plus size={14} /> Новый чат
            </button>
          </div>

          <div className="assistant-rail-section" style={{ flex: 1, overflowY: "auto" }}>
            <span className="assistant-rail-title">История диалогов</span>
            {conversations.length === 0 && <div className="hint">Пока нет чатов</div>}
            {conversations.map(c => (
              <div
                key={c.id}
                className={`assistant-rail-item${activeId === c.id ? " active" : ""}`}
                onClick={() => openConversation(c.id)}
              >
                <MessageSquare size={13} style={{ flexShrink: 0 }} />
                {renamingId === c.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === "Enter") saveRename(c.id); if (e.key === "Escape") setRenamingId(null); }}
                    onBlur={() => saveRename(c.id)}
                    style={{ flex: 1, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text)", fontSize: 12, padding: "2px 5px" }}
                  />
                ) : (
                  <span className="chat-title">{c.title}</span>
                )}
                <span className="chat-actions">
                  <button className="btn-ghost" onClick={e => startRename(c, e)} title="Переименовать"><Pencil size={11} /></button>
                  <button className="btn-ghost" onClick={e => deleteConversation(c.id, e)} title="Удалить"><Trash2 size={11} /></button>
                </span>
              </div>
            ))}
          </div>

          <div className="assistant-rail-section">
            <span className="assistant-rail-title">Быстрые инструкции</span>
            {EXAMPLES.map(ex => (
              <button key={ex} className="assistant-rail-item" onClick={() => send(ex)}>
                <Zap size={13} /> <span className="chat-title">{ex}</span>
              </button>
            ))}
          </div>

          <div className="assistant-rail-section">
            <button className="assistant-rail-item"><Megaphone size={13} /> Что нового</button>
            <button className="assistant-rail-item" onClick={() => window.open("mailto:support@demiresults.kg?subject=Ошибка в ИИ-помощнике", "_blank")}>
              <Bug size={13} /> Сообщить об ошибке
            </button>
          </div>
        </aside>

        <div className="assistant-chat">
          <button className="hamburger-btn" onClick={() => setRailOpen(o => !o)} style={{ margin: "8px 0 0 10px" }}>
            <Menu size={18} />
          </button>

          {messages.length === 0 ? (
            <div className="assistant-empty">
              <Sparkles size={40} color="var(--primary)" />
              <h2>Чем я могу помочь?</h2>
              <div className="assistant-examples">
                {EXAMPLES.map(ex => (
                  <button key={ex} className="assistant-example" onClick={() => send(ex)}>{ex}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="assistant-messages" ref={scrollRef}>
              {messages.map(m => (
                <div className={`msg ${m.role}`} key={m.id}>
                  <div className="msg-role">
                    {m.role === "assistant" ? <><Sparkles size={10} /> ИИ-помощник</> : "Вы"}
                  </div>
                  <div className="msg-bubble">
                    <div className="assistant-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                  {m.buttons.length > 0 && (
                    <div className="assistant-msg-buttons">
                      {m.buttons.map(b => (
                        <a key={b.href} href={b.href} className="btn-secondary" style={{ textDecoration: "none", fontSize: 11 }}>
                          {b.label}
                        </a>
                      ))}
                    </div>
                  )}
                  {m.created_at && <div className="msg-footer"><span className="msg-ts">{fmtTs(m.created_at)}</span></div>}
                </div>
              ))}
              {sending && (
                <div className="msg assistant">
                  <div className="msg-bubble"><div className="assistant-typing"><span /><span /><span /></div></div>
                </div>
              )}
              {pendingAction && (
                <ActionCard
                  action={pendingAction}
                  onDone={(msg) => {
                    setPendingAction(null);
                    setMessages(prev => [...prev, msg]);
                  }}
                />
              )}
            </div>
          )}

          <div className="compose assistant-compose">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Спросите про CRM или данные компании…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn-primary" onClick={() => send(input)} disabled={sending || !input.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
