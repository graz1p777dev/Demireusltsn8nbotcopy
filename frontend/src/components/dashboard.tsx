"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Send, Bot, User, Power, PowerOff, MessageSquare, X, ChevronDown, ChevronRight, LogOut, UserPlus, Trash2, Shield, ShieldOff, FlaskConical, Download, Plus, Pencil } from "lucide-react";

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

/* ── Resizable Grid ── */
function ResizableGrid({ children }: { children: React.ReactNode[] }) {
  const [leftWidth, setLeftWidth] = useState(290);
  const [dragging, setDragging] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);

    const startX = e.clientX;
    const startWidth = leftWidth;

    const onMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      const containerWidth = containerRef.current?.offsetWidth ?? 800;
      const next = Math.min(Math.max(startWidth + delta, 180), containerWidth - 300);
      setLeftWidth(next);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const [left, right] = React.Children.toArray(children);
  return (
    <div className="grid" ref={containerRef} style={{ userSelect: dragging ? "none" : undefined }}>
      <div style={{ width: leftWidth, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "none" }}
           className="panel">
        {left}
      </div>
      <div
        className={`resize-handle${dragging ? " dragging" : ""}`}
        onMouseDown={onMouseDown}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg)" }}
           className="panel">
        {right}
      </div>
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
    <ResizableGrid>
      {/* ─── LEFT: conversation list ─── */}
      <>
        <div className="panel-header">
          <strong>Диалоги</strong>
          <div className="panel-header-right">
            <span className="badge blue">{filtered.length}</span>
            <a
              href="/api/backend/admin/export/leads"
              download
              className="btn-ghost"
              title="Скачать CSV"
              style={{ display: "flex", alignItems: "center" }}
            >
              <Download size={13} />
            </a>
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
      </>

      {/* ─── RIGHT: chat + details ─── */}
      <>
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
      </>
    </ResizableGrid>
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

/* ── Changelog Panel ── */
type ChangeEntry = { date: string; tag: "feature" | "fix" | "improve" | "delete"; text: string };
type ChangeGroup = { version: string; date: string; entries: ChangeEntry[] };

const CHANGELOG: ChangeGroup[] = [
  {
    version: "1.10",
    date: "29.06.2026",
    entries: [
      { date: "29.06.2026", tag: "feature", text: "История чата: страница /chat/{lead_id} с пузырьками, ссылка в Telegram карточке" },
      { date: "29.06.2026", tag: "feature", text: "Тест ИИ бота в настройках — чат-интерфейс с текущим промптом, счётчик токенов" },
      { date: "29.06.2026", tag: "feature", text: "Tooltip на поле Telegram Chat ID: инструкция как узнать ID через @userinfobot" },
      { date: "29.06.2026", tag: "improve", text: "Новый домен CRM: demiresults.alihan-torebekov.kg, API: api-demiresults.alihan-torebekov.kg" },
      { date: "29.06.2026", tag: "improve", text: "Сообщение редакта удаляется после ответа менеджера (✏️ Редакт вручную / 🤖 AI редакт)" },
      { date: "29.06.2026", tag: "improve", text: "В карточке и промпте редакта показывается номер ответа №0000042" },
      { date: "29.06.2026", tag: "delete", text: "Удалён bot-test/ и мёртвый код _setup_crm_users_sync из main.py" },
      { date: "29.06.2026", tag: "improve", text: "Google Sheets: retry через tenacity (3 попытки, exponential backoff)" },
    ],
  },
  {
    version: "1.9",
    date: "20–22.06.2026",
    entries: [
      { date: "20.06.2026", tag: "feature", text: "Система напоминаний о консультациях: ежедневно в 10:00 Бишкек через Celery Beat" },
      { date: "20.06.2026", tag: "feature", text: "Кнопки ✅ Пришёл / ❌ Не пришёл в Telegram — отмечают визит в Google Sheets" },
      { date: "20.06.2026", tag: "feature", text: "Команда /consult — список консультаций на сегодня прямо в Telegram" },
      { date: "20.06.2026", tag: "feature", text: "Google Sheets: 14 колонок, автоматическое создание листов по месяцам" },
      { date: "20.06.2026", tag: "feature", text: "amoCRM ИИ Агент: автоматическое назначение ответственным при смене статуса лида" },
      { date: "20.06.2026", tag: "fix", text: "Worker Railway: добавлен минимальный HTTP-сервер чтобы обойти healthcheck" },
    ],
  },
  {
    version: "1.8",
    date: "10–15.06.2026",
    entries: [
      { date: "15.06.2026", tag: "improve", text: "Время последнего сообщения клиента в Telegram карточке" },
      { date: "15.06.2026", tag: "fix", text: "Ссылка на лид amoCRM остаётся в карточке после принятия решения" },
      { date: "10.06.2026", tag: "improve", text: "Бот знает рабочие часы Бишкека и не предлагает запись в нерабочее время" },
      { date: "10.06.2026", tag: "improve", text: "Контекст времени (Бишкек UTC+6) вшит в каждый AI-запрос" },
      { date: "10.06.2026", tag: "fix", text: "Определение языка клиента: AI вместо кириллической эвристики" },
    ],
  },
  {
    version: "1.7",
    date: "01–09.06.2026",
    entries: [
      { date: "05.06.2026", tag: "feature", text: "Страница консультаций с календарём слотов" },
      { date: "05.06.2026", tag: "feature", text: "Менеджеры Telegram: управление через CRM вместо только env-переменных" },
      { date: "05.06.2026", tag: "feature", text: "AI-переводы: переводы сообщений клиента и ответа бота в карточке" },
      { date: "01.06.2026", tag: "feature", text: "Расширенная аналитика: почасовая активность, топ проблем кожи, объём по дням" },
      { date: "01.06.2026", tag: "improve", text: "Обновление всех Telegram карточек при решении менеджера" },
    ],
  },
  {
    version: "1.6",
    date: "20–31.05.2026",
    entries: [
      { date: "28.05.2026", tag: "feature", text: "Конспект диалога от DeepSeek-гиперсupervisor в Telegram карточке" },
      { date: "28.05.2026", tag: "feature", text: "Динамический Score клиента (0–100%) в карточке" },
      { date: "25.05.2026", tag: "feature", text: "AI-редактор ответа: промпт «сделай короче», «добавь про акцию» и т.д." },
      { date: "20.05.2026", tag: "feature", text: "Кнопка «Предложить консультацию» в Telegram — переписывает ответ через AI" },
      { date: "20.05.2026", tag: "feature", text: "Кнопка «Переместить на этап» в Telegram с меню этапов amoCRM" },
    ],
  },
  {
    version: "1.5",
    date: "10–19.05.2026",
    entries: [
      { date: "15.05.2026", tag: "feature", text: "Бот отвечает на языке клиента (кыргызский, казахский, английский, узбекский и др.)" },
      { date: "15.05.2026", tag: "feature", text: "Ограничение менеджеров: Telegram карточки только для разрешённых chat_id" },
      { date: "10.05.2026", tag: "improve", text: "Контекст диалога расширен до 20 последних сообщений" },
      { date: "10.05.2026", tag: "fix", text: "Бот перестал повторять приветствие в продолжающемся диалоге" },
    ],
  },
  {
    version: "1.4",
    date: "01–09.05.2026",
    entries: [
      { date: "05.05.2026", tag: "feature", text: "Поддержка фото: анализ кожи клиента по фотографии через GPT-4o Vision" },
      { date: "05.05.2026", tag: "feature", text: "Воронка консультации: прогревающие вопросы + кнопка записи" },
      { date: "01.05.2026", tag: "feature", text: "Редактор промпта бота прямо в CRM" },
      { date: "01.05.2026", tag: "improve", text: "Светлая тема CRM: белый фон, шрифт Inter, рефакторинг UI" },
    ],
  },
  {
    version: "1.3",
    date: "20–30.04.2026",
    entries: [
      { date: "25.04.2026", tag: "feature", text: "CRM-авторизация: логин/пароль, управление пользователями, JWT" },
      { date: "25.04.2026", tag: "feature", text: "Страница настроек: промпт, менеджеры, пользователи CRM" },
      { date: "20.04.2026", tag: "feature", text: "Перетягиваемый разделитель между списком диалогов и чатом" },
    ],
  },
  {
    version: "1.2",
    date: "10–19.04.2026",
    entries: [
      { date: "15.04.2026", tag: "feature", text: "amoCRM: смена этапа лида при одобрении/отклонении ответа" },
      { date: "15.04.2026", tag: "feature", text: "Отправка карточек одобрения нескольким менеджерам Telegram" },
      { date: "10.04.2026", tag: "fix", text: "amoCRM: тип crm_entity должен быть числовым (2), не строкой" },
    ],
  },
  {
    version: "1.1",
    date: "01–09.04.2026",
    entries: [
      { date: "05.04.2026", tag: "feature", text: "Деплой на Railway (бэкенд + worker) и Vercel (фронтенд)" },
      { date: "05.04.2026", tag: "feature", text: "Telegram бот: карточки одобрения, кнопки Принять/Отклонить/Изменить/Сохранить" },
      { date: "01.04.2026", tag: "feature", text: "Интеграция amoCRM: webhook входящих сообщений, отправка ответов" },
    ],
  },
  {
    version: "1.0",
    date: "19.03.2026",
    entries: [
      { date: "19.03.2026", tag: "feature", text: "Первоначальный запуск: GPT-4o Mini бот, FastAPI бэкенд, Next.js CRM, PostgreSQL + Redis" },
    ],
  },
];

const TAG_STYLE: Record<ChangeEntry["tag"], { label: string; color: string; bg: string }> = {
  feature: { label: "новое",    color: "#34d399", bg: "rgba(52,211,153,.12)" },
  improve: { label: "улучшено", color: "#60a5fa", bg: "rgba(96,165,250,.12)" },
  fix:     { label: "фикс",     color: "#fbbf24", bg: "rgba(251,191,36,.12)" },
  delete:  { label: "удалено",  color: "#f87171", bg: "rgba(248,113,113,.12)" },
};

export function ChangelogPanel() {
  return (
    <section style={{ padding: "16px 20px" }}>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 20 }}>
        Полная история изменений проекта Demi Results AI Bot.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {CHANGELOG.map(group => (
          <div key={group.version}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <span style={{
                fontWeight: 700, fontSize: 13, color: "var(--text)",
                background: "var(--bg-3)", border: "1px solid var(--border)",
                borderRadius: 6, padding: "2px 9px",
              }}>
                v{group.version}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>{group.date}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 4 }}>
              {group.entries.map((e, i) => {
                const ts = TAG_STYLE[e.tag];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: ts.color,
                      background: ts.bg, borderRadius: 4, padding: "2px 6px",
                      whiteSpace: "nowrap", marginTop: 1, flexShrink: 0,
                    }}>
                      {ts.label}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{e.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── AI Test Panel ── */
type ChatMsg = { role: "user" | "assistant"; content: string; tokens?: number };

export function AiTestPanel() {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const newHistory: ChatMsg[] = [...history, { role: "user", content: text }];
    setHistory(newHistory);
    setInput("");
    setLoading(true);
    try {
      const res = await apiJson<{ ok: boolean; reply: string; tokens?: number; model?: string }>(
        "/admin/ai-test", "POST",
        { message: text, history: history.map(m => ({ role: m.role, content: m.content })) }
      );
      setHistory(prev => [...prev, { role: "assistant", content: res.reply, tokens: res.tokens }]);
    } catch {
      setHistory(prev => [...prev, { role: "assistant", content: "❌ Ошибка запроса" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: "16px 20px" }}>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
        Тест ИИ бота с текущим промптом. История диалога сохраняется внутри панели и не попадает в CRM.
      </p>

      {/* Chat area */}
      <div style={{
        minHeight: 240, maxHeight: 420, overflowY: "auto",
        background: "var(--bg-3)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 14px", marginBottom: 12,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {history.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
            Напишите сообщение — бот ответит как в реальном диалоге
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 2 }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 1 }}>
              {m.role === "user" ? <><User size={9} /> Вы</> : <><Bot size={9} /> ИИ бот{m.tokens ? ` · ${m.tokens} tok` : ""}</>}
            </div>
            <div style={{
              background: m.role === "user" ? "var(--accent)" : "var(--bg-2)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "8px 12px", fontSize: 13, maxWidth: "80%",
              border: m.role === "assistant" ? "1px solid var(--border)" : "none",
              whiteSpace: "pre-wrap", lineHeight: 1.5,
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
            <div style={{
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: "12px 12px 12px 2px", padding: "8px 14px",
              fontSize: 13, color: "var(--text-3)",
            }}>
              <RefreshCw size={12} style={{ animation: "spin .8s linear infinite" }} /> печатает…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          rows={2}
          placeholder="Введите сообщение клиента… (Ctrl+Enter)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) send(); }}
          disabled={loading}
          style={{
            flex: 1, background: "var(--bg-3)", border: "1px solid var(--border)",
            color: "var(--text)", borderRadius: 8, padding: "8px 12px",
            fontSize: 13, resize: "none", fontFamily: "var(--sans)", outline: "none",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button className="btn-primary" onClick={send} disabled={loading || !input.trim()}
            style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Send size={13} /> {loading ? "…" : "Отправить"}
          </button>
          <button className="btn-ghost" onClick={() => setHistory([])}
            style={{ padding: "6px 14px", fontSize: 12 }}>
            <X size={13} /> Очистить
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Telegram Managers Panel ── */
type TgManager = { name: string; chat_id: string };

export function ManagersPanel() {
  const [managers, setManagers] = useState<TgManager[]>([]);
  const [name, setName] = useState("");
  const [chatId, setChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<TgManager[]>("/admin/managers")
      .then(setManagers)
      .catch(() => setManagers([]))
      .finally(() => setLoading(false));
  }, []);

  const add = async () => {
    if (!name.trim() || !chatId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiJson<{ ok: boolean; managers: TgManager[] }>(
        "/admin/managers", "POST", { name: name.trim(), chat_id: chatId.trim() }
      );
      setManagers(res.managers);
      setName(""); setChatId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: TgManager) => {
    if (!confirm(`Удалить менеджера ${m.name}?`)) return;
    try {
      const res = await apiJson<{ ok: boolean; managers: TgManager[] }>(
        `/admin/managers/${encodeURIComponent(m.chat_id)}`, "DELETE"
      );
      setManagers(res.managers);
    } catch {
      setError("Ошибка удаления");
    }
  };

  return (
    <section style={{ padding: "16px 20px" }}>
      <p style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>
        Менеджеры получают Telegram-карточки с запросами на одобрение ответов бота.
        Для добавления менеджер должен написать боту хотя бы одно сообщение.
      </p>

      {/* Add form */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Имя менеджера"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ flex: "1 1 140px", minWidth: 0 }}
        />
        <div style={{ position: "relative", flex: "1 1 140px", minWidth: 0, display: "flex", alignItems: "center" }}>
          <input
            className="input"
            placeholder="Telegram Chat ID"
            value={chatId}
            onChange={e => setChatId(e.target.value)}
            style={{ width: "100%", paddingRight: 28 }}
          />
          <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", cursor: "default" }}
               title="Как узнать Chat ID: напишите боту @userinfobot в Telegram и скопируйте число из поля «Id»">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={{ color: "var(--text-3)", display: "block" }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
        </div>
        <button className="btn-primary" onClick={add} disabled={saving || !name.trim() || !chatId.trim()}
          style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <UserPlus size={14} /> Добавить
        </button>
      </div>
      {error && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 10 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>Загрузка...</div>
      ) : managers.length === 0 ? (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>
          Нет менеджеров из БД. Основные заданы через переменные окружения Railway.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {managers.map(m => (
            <div key={m.chat_id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", background: "var(--bg-3)", borderRadius: 8,
              border: "1px solid var(--border)",
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)", marginLeft: 8 }}>
                  {m.chat_id}
                </span>
              </div>
              <button className="btn-danger" style={{ padding: "4px 8px" }} onClick={() => remove(m)} title="Удалить">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Reply Templates Panel ── */
type Template = { id: number; name: string; text: string };

export function TemplatesPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [tplText, setTplText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiGet<Template[]>("/admin/templates")
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openAdd = () => { setEditing(null); setName(""); setTplText(""); setShowForm(true); };
  const openEdit = (t: Template) => { setEditing(t); setName(t.name); setTplText(t.text); setShowForm(true); };

  const save = async () => {
    if (!name.trim() || !tplText.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await apiJson(`/admin/templates/${editing.id}`, "PATCH", { name, text: tplText });
      } else {
        await apiJson("/admin/templates", "POST", { name, text: tplText });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Template) => {
    if (!confirm(`Удалить шаблон «${t.name}»?`)) return;
    await apiJson(`/admin/templates/${t.id}`, "DELETE");
    load();
  };

  return (
    <section style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Менеджер видит кнопку «📋 Шаблоны» в Telegram и выбирает готовый ответ одним нажатием
        </div>
        <button className="btn-primary" style={{ padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }} onClick={openAdd}>
          <Plus size={12} /> Добавить
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
            {editing ? "Редактировать шаблон" : "Новый шаблон"}
          </div>
          <input
            placeholder="Название (напр: Стандартный ответ)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: "100%", marginBottom: 8, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 7, padding: "7px 12px", fontSize: 13, fontFamily: "var(--sans)", outline: "none" }}
          />
          <textarea
            placeholder="Текст шаблона…"
            value={tplText}
            onChange={e => setTplText(e.target.value)}
            rows={4}
            style={{ width: "100%", marginBottom: 10, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 7, padding: "7px 12px", fontSize: 13, fontFamily: "var(--sans)", outline: "none", resize: "vertical" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={save} disabled={saving || !name.trim() || !tplText.trim()}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button className="btn-ghost" style={{ padding: "7px 14px", fontSize: 12 }} onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>Загрузка…</div>
      ) : templates.length === 0 ? (
        <div style={{ color: "var(--text-3)", fontSize: 13 }}>Шаблонов нет. Нажмите «Добавить».</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.text}</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn-ghost" style={{ padding: "4px 8px" }} onClick={() => openEdit(t)} title="Редактировать"><Pencil size={12} /></button>
                <button className="btn-danger" style={{ padding: "4px 8px" }} onClick={() => remove(t)} title="Удалить"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

