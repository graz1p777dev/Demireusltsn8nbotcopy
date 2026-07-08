"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Bot, User, ExternalLink, ArrowLeft, Headset } from "lucide-react";
import Link from "next/link";

type ChatMessage = {
  id: number;
  role: string;
  text: string;
  status: string;
  created_at: string | null;
};

type ChatData = {
  lead_id: string;
  client_name: string | null;
  client_phone: string | null;
  amocrm_url: string;
  messages: ChatMessage[];
};

function fmt(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ChatPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const [data, setData] = useState<ChatData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ChatData>(`/admin/chat/${leadId}`)
      .then(setData)
      .catch(e => setError(e.message || "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--text-3)", fontSize: 14 }}>
        Загрузка...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "var(--bg)" }}>
        <div style={{ color: "#fca5a5", fontSize: 14 }}>{error}</div>
        <Link href="/login" style={{ color: "var(--accent)", fontSize: 13 }}>Войти в CRM</Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid var(--border)", background: "var(--bg-2)",
        padding: "11px 14px", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ color: "var(--text-3)", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 14, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {data.client_name || "Без имени"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.client_phone ? `${data.client_phone} · ` : ""}Lead #{data.lead_id} · {data.messages.length} сообщ.
          </div>
        </div>
        <a
          href={data.amocrm_url}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть в amoCRM"
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            color: "var(--primary)",
            background: "var(--bg-3)", border: "1px solid var(--border)",
            borderRadius: 7, padding: "7px 10px", textDecoration: "none",
            fontSize: 12,
          }}
        >
          <ExternalLink size={13} />
          <span style={{ display: "none" }} className="chat-amo-label">amoCRM</span>
        </a>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 12px",
        maxWidth: 720, width: "100%", margin: "0 auto",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {data.messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 14, marginTop: 60 }}>
            Сообщений нет
          </div>
        )}
        {data.messages.map(m => {
          const isClient = m.role === "user";
          const isManager = m.role === "manager";
          // client → right; bot & consultant → left
          const label = isClient
            ? <><User size={10} /> Клиент</>
            : isManager
              ? <><Headset size={10} /> Консультант</>
              : <><Bot size={10} /> ИИ бот</>;
          const bubbleStyle: React.CSSProperties = isClient
            ? { background: "var(--primary)", color: "#fff", border: "none", borderRadius: "12px 4px 12px 12px" }
            : isManager
              ? { background: "rgba(34,197,94,.12)", color: "var(--text)", border: "1px solid rgba(34,197,94,.4)", borderRadius: "4px 12px 12px 12px" }
              : { background: "var(--bg-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px" };
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isClient ? "flex-end" : "flex-start", gap: 3 }}>
              <div style={{ fontSize: 10, color: isManager ? "#22c55e" : "var(--text-3)", display: "flex", alignItems: "center", gap: 4 }}>
                {label}
                {m.created_at && <span style={{ marginLeft: 4, color: "var(--text-3)" }}>{fmt(m.created_at)}</span>}
              </div>
              <div style={{
                ...bubbleStyle,
                padding: "9px 13px",
                fontSize: 13,
                maxWidth: "85%",
                whiteSpace: "pre-wrap",
                lineHeight: 1.55,
                wordBreak: "break-word",
              }}>
                {m.text}
              </div>
              {m.role === "assistant" && (
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: m.status === "pending_review" ? "#f59e0b" : "#22c55e",
                }}>
                  {m.status === "pending_review" ? "#непринятое" : "#принято"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
