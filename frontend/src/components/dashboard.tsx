"use client";

import { useMemo, useState } from "react";
import { apiGet, apiJson, Conversation } from "@/lib/api";

type LeadDetail = {
  lead: Conversation & { client: string | null };
  messages: { role: string; text: string; status: string; created_at: string }[];
  logs: { action: string; status: string; error: string | null; created_at: string }[];
  extracted: Record<string, unknown>[];
  memory: { key: string; value: string; source: string }[];
  approvals: {
    id: number;
    status: string;
    client_message: string;
    ai_reply: string;
    edited_reply: string | null;
    manager_telegram_id: string | null;
    amocrm_stage_name: string | null;
    amocrm_status_id: number | null;
    created_at: string;
    approved_at: string | null;
  }[];
  usage_summary: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    total_cost: number;
  };
  usage: {
    provider: string;
    model: string;
    purpose: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    total_cost: number;
    latency_ms: number | null;
    created_at: string;
  }[];
  training_examples: {
    id: number;
    client_message: string;
    ai_reply: string;
    final_reply: string;
    was_edited: boolean;
    quality_label: string;
    created_at: string;
  }[];
};

export function Dashboard({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<number | null>(initialConversations[0]?.id ?? null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(
    () =>
      conversations.filter((item) =>
        `${item.client ?? ""} ${item.amocrm_lead_id} ${item.chat_id ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [conversations, query],
  );

  async function selectLead(id: number) {
    setSelectedId(id);
    setDetail(await apiGet<LeadDetail>(`/admin/leads/${id}`));
  }

  async function toggleAI(enabled: boolean) {
    if (!selectedId) return;
    await apiJson(`/admin/leads/${selectedId}/ai`, "PATCH", { enabled });
    await selectLead(selectedId);
    setConversations((items) => items.map((item) => (item.id === selectedId ? { ...item, ai_enabled: enabled } : item)));
  }

  async function sendManualMessage() {
    if (!selectedId || !message.trim()) return;
    await apiJson(`/admin/leads/${selectedId}/messages`, "POST", { text: message });
    setMessage("");
    await selectLead(selectedId);
  }

  return (
    <section className="grid" id="dialogs">
      <div className="card">
        <div className="card-header">
          <strong>Диалоги</strong>
          <span className="badge">{filtered.length}</span>
        </div>
        <div style={{ padding: 12 }}>
          <input placeholder="Поиск по клиентам и лидам" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="list">
          {filtered.map((item) => (
            <div
              className={`row ${item.id === selectedId ? "active" : ""}`}
              key={item.id}
              onClick={() => selectLead(item.id)}
            >
              <strong>{item.client || "Без имени"}</strong>
              <div className="muted">Lead #{item.amocrm_lead_id}</div>
              <div className="badge">{item.ai_enabled ? "AI включен" : "AI выключен"}</div>
            </div>
          ))}
          {!filtered.length && <div className="row muted">Диалогов пока нет. Отправьте seed webhook или подключите amoCRM.</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <strong>{detail?.lead.client || "Выберите диалог"}</strong>
            {detail && <div className="muted">amoCRM lead #{detail.lead.amocrm_lead_id}</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="secondary" onClick={() => toggleAI(false)}>Выключить AI</button>
            <button onClick={() => toggleAI(true)}>Включить AI</button>
          </div>
        </div>

        <div className="chat">
          {detail && (
            <div className="metrics">
              <span><b>{detail.usage_summary.total_tokens}</b> tokens</span>
              <span>in {detail.usage_summary.prompt_tokens}</span>
              <span>out {detail.usage_summary.completion_tokens}</span>
              <span>${detail.usage_summary.total_cost.toFixed(6)}</span>
            </div>
          )}
          {(detail?.messages ?? []).map((item, index) => (
            <div className={`bubble ${item.role}`} key={`${item.created_at}-${index}`}>
              <div>{item.text}</div>
              <small className="muted">{item.status}</small>
            </div>
          ))}
          {!detail && <div className="muted">Кликните по диалогу слева, чтобы открыть чат, карточку и логи.</div>}
        </div>

        <div className="form">
          <textarea rows={2} placeholder="Ручное сообщение оператором" value={message} onChange={(event) => setMessage(event.target.value)} />
          <button onClick={sendManualMessage}>Отправить</button>
        </div>

        <div className="tabs">
          <div className="tab">
            <strong>Extracted fields</strong>
            <pre>{JSON.stringify(detail?.extracted?.[0] ?? {}, null, 2)}</pre>
          </div>
          <div className="tab" id="actions">
            <strong>Что сделал бот</strong>
            {(detail?.logs ?? []).slice(0, 6).map((log, index) => (
              <p key={index}>
                <span className="badge">{log.status}</span> {log.action}
                {log.error && <span className="muted"> {log.error}</span>}
              </p>
            ))}
          </div>
          <div className="tab">
            <strong>Память клиента</strong>
            {(detail?.memory ?? []).map((item) => (
              <p key={item.key}>
                <b>{item.key}</b>: {item.value}
              </p>
            ))}
            {!detail?.memory?.length && <p className="muted">Пока пусто</p>}
          </div>
        </div>
        <div className="usage-table">
          <strong>OpenAI usage</strong>
          {(detail?.usage ?? []).slice(0, 8).map((item, index) => (
            <div className="usage-row" key={`${item.created_at}-${index}`}>
              <span>{item.purpose}</span>
              <span>{item.model}</span>
              <span>{item.total_tokens} tokens</span>
              <span>{item.latency_ms ?? "-"} ms</span>
              <span>${item.total_cost.toFixed(6)}</span>
            </div>
          ))}
          {detail && !detail.usage.length && <p className="muted">AI usage пока не записан.</p>}
        </div>
        <div className="usage-table">
          <strong>Human approvals</strong>
          {(detail?.approvals ?? []).slice(0, 6).map((item) => (
            <div className="approval-row" key={item.id}>
              <span className="badge">{item.status}</span>
              <div>
                <span className="muted">amoCRM: {item.amocrm_stage_name || item.amocrm_status_id || "-"}</span>
                <br />
                <b>AI:</b> {item.ai_reply}
                {item.edited_reply && (
                  <>
                    <br />
                    <b>Edited:</b> {item.edited_reply}
                  </>
                )}
              </div>
            </div>
          ))}
          {detail && !detail.approvals.length && <p className="muted">Approval-заявок пока нет.</p>}
        </div>
        <div className="usage-table">
          <strong>Training examples</strong>
          {(detail?.training_examples ?? []).slice(0, 6).map((item) => (
            <div className="approval-row" key={item.id}>
              <span className="badge">{item.was_edited ? "edited" : "accepted"}</span>
              <div>
                <b>Client:</b> {item.client_message}
                <br />
                <b>Good reply:</b> {item.final_reply}
              </div>
            </div>
          ))}
          {detail && !detail.training_examples.length && (
            <p className="muted">Пока нет принятых ответов для обучения.</p>
          )}
        </div>
      </div>
    </section>
  );
}
