"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { RefreshCw, Send, Bot, User, Power, PowerOff, MessageSquare, X, ChevronDown, ChevronRight } from "lucide-react";
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
    <section className="grid" id="dialogs">
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
