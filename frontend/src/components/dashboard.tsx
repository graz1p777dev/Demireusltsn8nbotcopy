"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { RefreshCw, Send, Bot, User, Power, PowerOff, MessageSquare, X, ChevronDown, ChevronRight, LogOut, UserPlus, Trash2, Shield, ShieldOff } from "lucide-react";

function ChannelIcon({ phone }: { phone: string | null }) {
  if (phone) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366" style={{ flexShrink: 0 }}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="url(#ig)" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}
import { useRouter } from "next/navigation";
import { apiGet, apiJson, Conversation } from "@/lib/api";

type Message = { role: string; text: string; status: string; created_at: string };

type Approval = {
  id: number; status: string; client_message: string;
  ai_reply: string; edited_reply: string | null;
  manager_telegram_id: string | null;
  amocrm_stage_name: string | null; amocrm_status_id: number | null;
  created_at: string; approved_at: string | null;
};

type LeadDetail = {
  lead: Conversation & { client: string | null };
  messages: Message[];
  logs: { action: string; status: string; error: string | null; created_at: string }[];
  extracted: Record<string, unknown>[];
  memory: { key: string; value: string; source: string }[];
  approvals: Approval[];
  usage_summary: { prompt_tokens: number; completion_tokens: number; total_tokens: number; total_cost: number };
  usage: {
    model: string; purpose: string; prompt_tokens: number;
    completion_tokens: number; total_tokens: number;
    total_cost: number; latency_ms: number | null; created_at: string;
  }[];
  training_examples: {
    id: number; client_message: string; final_reply: string;
    was_edited: boolean; created_at: string;
  }[];
};

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ s }: { s: string }) {
  if (s === "sent" || s === "approved" || s === "success")
    return <span className="badge green">{s}</span>;
  if (s === "queued" || s === "pending" || s === "edited" || s === "saved")
    return <span className="badge amber">{s}</span>;
  if (s === "rejected" || s === "failed" || s === "send_failed" || s === "error")
    return <span className="badge red">{s}</span>;
  return <span className="badge">{s}</span>;
}

/* ── Live Clock ── */
export function LiveClockWidget() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="clock">──.──.──── ──:──:──</div>;
  return (
    <div className="clock">
      {now.toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })}
    </div>
  );
}

/* ── Collapsible Section Shell ── */
export function SectionShell({
  id, title, icon, children, defaultOpen = true,
}: {
  id: string; title: string; icon: React.ReactNode;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px",
        background: "var(--bg-2)", borderBottom: open ? "1px solid var(--border)" : "none",
        cursor: "pointer", userSelect: "none",
      }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          {icon}
          {title}
        </div>
        <button
          className="btn-ghost"
          style={{ padding: "2px 6px" }}
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          title={open ? "Свернуть" : "Развернуть"}
        >
          {open ? <X size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && children}
    </div>
  );
}


/* ── Main Dashboard ── */
export function Dashboard({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () => conversations.filter((c) =>
      `${c.client ?? ""} ${c.amocrm_lead_id} ${c.chat_id ?? ""}`.toLowerCase().includes(query.toLowerCase())
    ),
    [conversations, query],
  );

  const selectLead = useCallback(async (id: number) => {
    setSelectedId(id);
    setLoading(true);
    try {
      const data = await apiGet<LeadDetail>(`/admin/leads/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const list = await apiGet<Conversation[]>("/admin/conversations");
      setConversations(list);
      if (selectedId) await selectLead(selectedId);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAI = async (enabled: boolean) => {
    if (!selectedId) return;
    await apiJson(`/admin/leads/${selectedId}/ai`, "PATCH", { enabled });
    setConversations((prev) => prev.map((c) => c.id === selectedId ? { ...c, ai_enabled: enabled } : c));
    selectLead(selectedId);
  };

  const sendMessage = async () => {
    if (!selectedId || !message.trim() || sending) return;
    setSending(true);
    try {
      await apiJson(`/admin/leads/${selectedId}/messages`, "POST", { text: message });
      setMessage("");
      await selectLead(selectedId);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="grid">
      {/* ─── LEFT: conversation list ─── */}
      <div className="panel">
        <div className="panel-header">
          <strong>Диалоги</strong>
          <div className="panel-header-right">
            <span className="badge blue">{filtered.length}</span>
            <button
              className="btn-ghost"
              onClick={refresh}
              disabled={refreshing}
              title="Обновить список"
            >
              <RefreshCw size={13} style={{ animation: refreshing ? "spin .8s linear infinite" : "none" }} />
            </button>
          </div>
        </div>

        <div className="search-wrap">
          <input
            placeholder="Поиск по имени, Lead ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="convo-list">
          {filtered.map((c) => (
            <div
              key={c.id}
              className={`convo-item ${c.id === selectedId ? "active" : ""}`}
              onClick={() => selectLead(c.id)}
            >
              <div className="name">
                <ChannelIcon phone={c.phone} />
                {c.client || "Без имени"}
                {c.ai_enabled
                  ? <span className="badge green">AI</span>
                  : <span className="badge">AI выкл</span>
                }
              </div>
              <div className="meta">
                <span>Lead #{c.amocrm_lead_id}</span>
              </div>
              {c.last_message_at && (
                <div className="ts">{fmt(c.last_message_at)}</div>
              )}
            </div>
          ))}
          {!filtered.length && (
            <div className="empty">
              <MessageSquare size={32} />
              <div>Диалогов пока нет.<br />Подключите amoCRM webhook.</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: chat + details ─── */}
      <div className="panel">
        {/* Chat header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <strong>{detail?.lead.client || (loading ? "Загрузка…" : "Выберите диалог")}</strong>
            {detail && (
              <div className="sub">
                Lead #{detail.lead.amocrm_lead_id}
                {detail.lead.chat_id ? ` · chat ${detail.lead.chat_id}` : ""}
              </div>
            )}
          </div>
          {detail && (
            <div className="chat-header-actions">
              <button className="btn-secondary" onClick={() => toggleAI(false)}>
                <PowerOff size={12} /> AI выкл
              </button>
              <button className="btn-primary" onClick={() => toggleAI(true)}>
                <Power size={12} /> AI вкл
              </button>
              <button className="btn-ghost" onClick={() => { setSelectedId(null); setDetail(null); }} title="Закрыть">
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Metrics */}
        {detail && (
          <div className="metrics-bar">
            <div className="metric">
              <span className="metric-label">Tokens</span>
              <span className="metric-value">{detail.usage_summary.total_tokens.toLocaleString()}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Input</span>
              <span className="metric-value">{detail.usage_summary.prompt_tokens.toLocaleString()}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Output</span>
              <span className="metric-value">{detail.usage_summary.completion_tokens.toLocaleString()}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Cost</span>
              <span className="metric-value">${detail.usage_summary.total_cost.toFixed(5)}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {loading && (
            <div className="empty"><RefreshCw size={24} style={{ animation: "spin .8s linear infinite" }} /></div>
          )}
          {!loading && !detail && (
            <div className="empty">
              <Bot size={36} />
              <div>Выберите диалог из списка слева,<br />чтобы увидеть переписку.</div>
            </div>
          )}
          {(detail?.messages ?? []).map((m, i) => (
            <div className={`msg ${m.role}`} key={`${m.created_at}-${i}`}>
              <div className="msg-role">
                {m.role === "user" ? <><User size={11} /> Клиент</> : <><Bot size={11} /> AI Бот</>}
              </div>
              <div className="msg-bubble">{m.text}</div>
              <div className="msg-footer">
                <span className="msg-ts">{fmt(m.created_at)}</span>
                <StatusBadge s={m.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Compose */}
        <div className="compose">
          <textarea
            rows={2}
            placeholder="Ручное сообщение… (Ctrl+Enter для отправки)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) sendMessage(); }}
            disabled={!selectedId}
          />
          <button
            className="btn-primary"
            onClick={sendMessage}
            disabled={!message.trim() || sending || !selectedId}
          >
            <Send size={13} />
            {sending ? "…" : "Отправить"}
          </button>
        </div>

        {/* Detail tabs */}
        <div className="detail-tabs">
          <div className="detail-tab">
            <button className="collapsible-header" onClick={() => setCollapsed(p => ({ ...p, fields: !p.fields }))}>
              <span className="detail-tab-title" style={{ margin: 0 }}>Extracted fields</span>
              {collapsed.fields ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!collapsed.fields && <pre style={{ marginTop: 8 }}>{JSON.stringify(detail?.extracted?.[0] ?? {}, null, 2)}</pre>}
          </div>
          <div className="detail-tab" id="actions">
            <button className="collapsible-header" onClick={() => setCollapsed(p => ({ ...p, logs: !p.logs }))}>
              <span className="detail-tab-title" style={{ margin: 0 }}>Действия бота</span>
              {collapsed.logs ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!collapsed.logs && (detail?.logs ?? []).slice(0, 5).map((l, i) => (
              <p key={i} style={{ marginTop: 6 }}>
                <StatusBadge s={l.status} /> <span style={{ marginLeft: 5 }}>{l.action}</span>
                {l.error && <span className="muted"> — {l.error.slice(0, 80)}</span>}
                <div className="ts">{fmt(l.created_at)}</div>
              </p>
            ))}
            {!collapsed.logs && !detail?.logs?.length && <p className="muted">Нет действий</p>}
          </div>
          <div className="detail-tab">
            <button className="collapsible-header" onClick={() => setCollapsed(p => ({ ...p, memory: !p.memory }))}>
              <span className="detail-tab-title" style={{ margin: 0 }}>Память клиента</span>
              {collapsed.memory ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!collapsed.memory && (detail?.memory ?? []).map((m) => (
              <p key={m.key} style={{ marginTop: 4 }}><span className="muted">{m.key}:</span> {m.value}</p>
            ))}
            {!collapsed.memory && !detail?.memory?.length && <p className="muted">Пусто</p>}
          </div>
        </div>

        {/* OpenAI usage */}
        <div className="data-section">
          <button className="collapsible-header" onClick={() => setCollapsed(p => ({ ...p, usage: !p.usage }))}>
            <span className="data-section-title" style={{ margin: 0 }}>OpenAI Usage</span>
            {collapsed.usage ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          {!collapsed.usage && (detail?.usage ?? []).slice(0, 6).map((u, i) => (
            <div className="usage-row" key={`${u.created_at}-${i}`} style={{ marginTop: 6 }}>
              <span>{u.purpose}</span>
              <span>{u.model}</span>
              <span>{u.total_tokens} tok</span>
              <span>{u.latency_ms ?? "—"} ms</span>
              <span className="cost">${u.total_cost.toFixed(5)}</span>
            </div>
          ))}
          {!collapsed.usage && detail && !detail.usage.length && <p className="muted" style={{ fontSize: 12 }}>Нет данных</p>}
        </div>

        {/* Approvals */}
        <div className="data-section">
          <button className="collapsible-header" onClick={() => setCollapsed(p => ({ ...p, approvals: !p.approvals }))}>
            <span className="data-section-title" style={{ margin: 0 }}>Human Approvals</span>
            {collapsed.approvals ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          {!collapsed.approvals && (detail?.approvals ?? []).slice(0, 4).map((a) => (
            <div className="approval-row" key={a.id} style={{ marginTop: 6 }}>
              <div className="approval-meta">
                <StatusBadge s={a.status} />
                <span className="ts">{fmt(a.created_at)}</span>
                {a.approved_at && <span className="ts">✓ {fmt(a.approved_at)}</span>}
                {a.amocrm_stage_name && <span className="badge">{a.amocrm_stage_name}</span>}
              </div>
              <div><b>AI:</b> {a.ai_reply.slice(0, 120)}</div>
              {a.edited_reply && <div><b>Ред:</b> {a.edited_reply.slice(0, 120)}</div>}
            </div>
          ))}
          {!collapsed.approvals && detail && !detail.approvals.length && <p className="muted" style={{ fontSize: 12 }}>Нет заявок</p>}
        </div>

        {/* Training */}
        <div className="data-section">
          <button className="collapsible-header" onClick={() => setCollapsed(p => ({ ...p, training: !p.training }))}>
            <span className="data-section-title" style={{ margin: 0 }}>Training Examples</span>
            {collapsed.training ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          {!collapsed.training && (detail?.training_examples ?? []).slice(0, 3).map((t) => (
            <div className="approval-row" key={t.id} style={{ marginTop: 6 }}>
              <div className="approval-meta">
                {t.was_edited ? <span className="badge amber">edited</span> : <span className="badge green">accepted</span>}
                <span className="ts">{fmt(t.created_at)}</span>
              </div>
              <div><b>Client:</b> {t.client_message.slice(0, 100)}</div>
              <div><b>Final:</b> {t.final_reply.slice(0, 100)}</div>
            </div>
          ))}
          {!collapsed.training && detail && !detail.training_examples.length && <p className="muted" style={{ fontSize: 12 }}>Нет примеров</p>}
        </div>
      </div>
    </section>
  );
}

/* ── Prompt Panel ── */
export function PromptPanel() {
  const [prompt, setPrompt] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<{ prompt: string }>("/admin/bot-prompt")
      .then((d) => { setPrompt(d.prompt); setOriginal(d.prompt); })
      .finally(() => setLoading(false));
  }, [open]);

  async function save() {
    setSaving(true);
    try {
      await apiJson("/admin/bot-prompt", "PATCH", { prompt });
      setOriginal(prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setPrompt(original);
    setOpen(false);
  }

  return (
    <section style={{ padding: "20px 24px" }}>
      {!open && (
        <div style={{ marginBottom: 0 }}>
          <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}
            onClick={() => setOpen(true)}>
            <Bot size={13} /> Редактировать промпт
          </button>
        </div>
      )}

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
            Системный промпт, которым руководствуется бот при ответах клиентам.
          </p>
          {loading ? (
            <div className="muted" style={{ fontSize: 13 }}>Загрузка...</div>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={18}
              style={{
                width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 8, padding: "10px 12px", fontSize: 12,
                fontFamily: "var(--mono)", lineHeight: 1.6, resize: "vertical",
                boxSizing: "border-box", outline: "none",
              }}
            />
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: 12 }} onClick={cancel}>
              Отмена
            </button>
            <button
              className="btn-primary"
              style={{ padding: "7px 18px", fontSize: 12 }}
              onClick={save}
              disabled={saving || loading}
            >
              {saving ? "Сохранение..." : saved ? "✓ Сохранено" : "Сохранить"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


/* ── Logout Button ── */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/backend/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn-ghost" onClick={handleLogout} disabled={loading}
      style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "flex-start", padding: "6px 0" }}
      title="Выйти">
      <LogOut size={13} />
      <span style={{ fontSize: 11 }}>Выйти</span>
    </button>
  );
}

/* ── Users Panel ── */
type CrmUser = { id: number; username: string; is_admin: boolean; is_active: boolean; created_at: string };

export function UsersPanel() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", is_admin: false });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CrmUser[]>("/admin/crm-users");
      setUsers(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      await apiJson("/admin/crm-users", "POST", newUser);
      setNewUser({ username: "", password: "", is_admin: false });
      setShowForm(false);
      await loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка";
      setError(msg);
    } finally {
      setAdding(false);
    }
  }

  async function toggleAdmin(u: CrmUser) {
    await apiJson(`/admin/crm-users/${u.id}`, "PATCH", { is_admin: !u.is_admin });
    await loadUsers();
  }

  async function toggleActive(u: CrmUser) {
    await apiJson(`/admin/crm-users/${u.id}`, "PATCH", { is_active: !u.is_active });
    await loadUsers();
  }

  async function deleteUser(u: CrmUser) {
    if (!confirm(`Удалить пользователя ${u.username}?`)) return;
    await apiJson(`/admin/crm-users/${u.id}`, "DELETE", undefined);
    await loadUsers();
  }

  return (
    <section style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}
          onClick={() => setShowForm(!showForm)}>
          <UserPlus size={13} /> Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={addUser} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, background: "var(--bg-3)", padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}>
          <input
            placeholder="Логин"
            value={newUser.username}
            onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
            required
            style={{ flex: 1, minWidth: 120, background: "var(--bg-4)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "7px 11px", fontSize: 13, fontFamily: "var(--sans)" }}
          />
          <input
            placeholder="Пароль"
            type="password"
            value={newUser.password}
            onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
            required
            style={{ flex: 1, minWidth: 120, background: "var(--bg-4)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "7px 11px", fontSize: 13, fontFamily: "var(--sans)" }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
            <input type="checkbox" checked={newUser.is_admin} onChange={e => setNewUser(p => ({ ...p, is_admin: e.target.checked }))} />
            Админ
          </label>
          <button type="submit" className="btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} disabled={adding}>
            {adding ? "..." : "Создать"}
          </button>
          <button type="button" className="btn-ghost" style={{ padding: "7px 10px" }} onClick={() => setShowForm(false)}>
            <X size={14} />
          </button>
          {error && <div style={{ width: "100%", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
        </form>
      )}

      {loading ? (
        <div className="muted" style={{ fontSize: 13 }}>Загрузка...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {users.map(u => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: 9, padding: "9px 14px",
              opacity: u.is_active ? 1 : 0.5,
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{u.username}</span>
                {u.is_admin && <span className="badge blue" style={{ marginLeft: 7 }}>admin</span>}
                {!u.is_active && <span className="badge red" style={{ marginLeft: 7 }}>деактивирован</span>}
              </div>
              <button className="btn-ghost" style={{ padding: "4px 8px" }} onClick={() => toggleAdmin(u)} title={u.is_admin ? "Снять права admin" : "Сделать admin"}>
                {u.is_admin ? <ShieldOff size={13} /> : <Shield size={13} />}
              </button>
              <button className="btn-ghost" style={{ padding: "4px 8px" }} onClick={() => toggleActive(u)} title={u.is_active ? "Деактивировать" : "Активировать"}>
                {u.is_active ? <PowerOff size={13} /> : <Power size={13} />}
              </button>
              <button className="btn-danger" style={{ padding: "4px 8px" }} onClick={() => deleteUser(u)} title="Удалить">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
