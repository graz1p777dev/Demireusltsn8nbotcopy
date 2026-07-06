"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { apiGet, apiJson } from "@/lib/api";

type DayRow = { day: string; new: number; approved: number; rejected: number; saved: number };
type BlacklistEntry = { id: number; phone: string; reason: string | null; created_at: string };
type FunnelRow = { stage: string; count: number; pct: number };
type ManagerRow = { manager_id: string; approved: number; rejected: number; edited: number; saved: number };
type BestReply = { id: number; lead_id: string; client_message: string; ai_reply: string; created_at: string };

export default function ReportsPage() {
  const [daily, setDaily] = useState<DayRow[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [stopWords, setStopWords] = useState<string[]>([]);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [bestReplies, setBestReplies] = useState<BestReply[]>([]);
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // allSettled: one failed endpoint must not hang the whole page
    const [d, bl, sw, fn, mg, br] = await Promise.allSettled([
      apiGet<DayRow[]>("/admin/reports/daily?days=30"),
      apiGet<BlacklistEntry[]>("/admin/blacklist"),
      apiGet<{ words: string[] }>("/admin/stop-words"),
      apiGet<FunnelRow[]>("/admin/analytics/funnel"),
      apiGet<ManagerRow[]>("/admin/analytics/managers"),
      apiGet<BestReply[]>("/admin/analytics/best-replies?limit=15"),
    ]);
    if (d.status === "fulfilled") setDaily(d.value);
    if (bl.status === "fulfilled") setBlacklist(bl.value);
    if (sw.status === "fulfilled") setStopWords(sw.value.words);
    if (fn.status === "fulfilled") setFunnel(fn.value);
    if (mg.status === "fulfilled") setManagers(mg.value);
    if (br.status === "fulfilled") setBestReplies(br.value);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBlacklist = async () => {
    if (!newPhone.trim()) return;
    await apiJson("/admin/blacklist", "POST", { phone: newPhone.trim(), reason: newReason.trim() || null });
    setNewPhone(""); setNewReason("");
    load();
  };

  const removeBlacklist = async (id: number) => {
    await apiJson(`/admin/blacklist/${id}`, "DELETE");
    load();
  };

  const addStopWord = async () => {
    if (!newWord.trim()) return;
    const updated = [...stopWords, newWord.trim().toLowerCase()];
    await apiJson("/admin/stop-words", "PUT", { words: updated });
    setNewWord("");
    load();
  };

  const removeStopWord = async (word: string) => {
    const updated = stopWords.filter(w => w !== word);
    await apiJson("/admin/stop-words", "PUT", { words: updated });
    load();
  };

  const card = (title: string, children: React.ReactNode) => (
    <div style={{
      background: "var(--bg-2)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "18px 20px",
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)",
    borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none",
  };

  const totalApproved = daily.reduce((s, r) => s + r.approved, 0);
  const totalRejected = daily.reduce((s, r) => s + r.rejected, 0);
  const totalNew = daily.reduce((s, r) => s + r.new, 0);

  return (
    <AppShell title="Отчёты" subtitle="Ежедневная сводка, черный список, стоп-слова, аналитика">
      <div style={{ padding: 24, overflowY: "auto" }}>
      {loading ? <p style={{ color: "var(--text-3)", fontSize: 14 }}>Загрузка...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Summary pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {[
              { label: "Новых за 30 дней", value: totalNew, color: "var(--primary)" },
              { label: "Принято", value: totalApproved, color: "#22c55e" },
              { label: "Отклонено", value: totalRejected, color: "#ef4444" },
              { label: "В черном списке", value: blacklist.length, color: "#f59e0b" },
              { label: "Стоп-слов", value: stopWords.length, color: "#8b5cf6" },
            ].map(p => (
              <div key={p.label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: p.color }}>{p.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{p.label}</div>
              </div>
            ))}
          </div>

          {/* Daily table */}
          {card("📅 Ежедневная сводка (30 дней)",
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "var(--text-3)" }}>
                    {["Дата", "Новых", "Принято", "Отклонено", "Сохранено"].map((h, i) => (
                      <th key={h} style={{
                        padding: "6px 12px", textAlign: i === 0 ? "left" : "right", fontWeight: 500,
                        position: "sticky", top: 0, background: "var(--bg-2)",
                        borderBottom: "1px solid var(--border)", fontSize: 11,
                        textTransform: "uppercase", letterSpacing: ".04em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daily.map(r => (
                    <tr key={r.day} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", color: "var(--text-2)" }}>{r.day}</td>
                      <td style={{ padding: "8px 12px", color: "var(--primary)", fontWeight: 600, textAlign: "right" }}>{r.new}</td>
                      <td style={{ padding: "8px 12px", color: "#22c55e", textAlign: "right" }}>{r.approved}</td>
                      <td style={{ padding: "8px 12px", color: "#ef4444", textAlign: "right" }}>{r.rejected}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-3)", textAlign: "right" }}>{r.saved}</td>
                    </tr>
                  ))}
                  {daily.length === 0 && <tr><td colSpan={5} style={{ padding: 16, color: "var(--text-3)", textAlign: "center", fontSize: 13 }}>Нет данных</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Funnel + Managers side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {card("🔽 Воронка по этапам",
              <div>
                {funnel.map(r => (
                  <div key={r.stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span>{r.stage}</span>
                      <span style={{ color: "var(--text-3)" }}>{r.count} · {r.pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${r.pct}%`, height: "100%", background: "var(--primary)", borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
                {funnel.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Нет данных</p>}
              </div>
            )}
            {card("👤 Активность менеджеров",
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-3)" }}>
                    {["Менеджер", "Принял", "Откл.", "Изменил", "Сохр."].map((h, i) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: i === 0 ? "left" : "right", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {managers.map(r => (
                    <tr key={r.manager_id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 8px", fontWeight: 600, color: "var(--text-2)" }}>{r.manager_id}</td>
                      <td style={{ padding: "8px 8px", color: "#22c55e", textAlign: "right" }}>{r.approved}</td>
                      <td style={{ padding: "8px 8px", color: "#ef4444", textAlign: "right" }}>{r.rejected}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right" }}>{r.edited}</td>
                      <td style={{ padding: "8px 8px", color: "var(--text-3)", textAlign: "right" }}>{r.saved}</td>
                    </tr>
                  ))}
                  {managers.length === 0 && <tr><td colSpan={5} style={{ padding: 12, color: "var(--text-3)", textAlign: "center" }}>Нет данных</td></tr>}
                </tbody>
              </table>
            )}
          </div>

          {/* Best replies */}
          {card("⭐ Лучшие AI-ответы (принято без изменений)",
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
              {bestReplies.map(r => (
                <div key={r.id} style={{ background: "var(--bg-3)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Lead {r.lead_id} · №{String(r.id).padStart(7, "0")}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>{r.created_at}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>
                    <b>Клиент:</b> {r.client_message}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-1)" }}>
                    <b>Ответ ИИ:</b> {r.ai_reply}
                  </div>
                </div>
              ))}
              {bestReplies.length === 0 && <p style={{ color: "var(--text-3)", fontSize: 13 }}>Нет данных</p>}
            </div>
          )}

          {/* Stop words */}
          {card("⛔ Стоп-слова",
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {stopWords.map(w => (
                  <span key={w} style={{ background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 20, padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "var(--text-2)" }}>
                    {w}
                    <button onClick={() => removeStopWord(w)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ))}
                {stopWords.length === 0 && <span style={{ color: "var(--text-3)", fontSize: 13 }}>Нет стоп-слов</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newWord} onChange={e => setNewWord(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addStopWord()}
                  placeholder="Добавить слово..." style={{ ...inputStyle, flex: 1, maxWidth: 240 }} />
                <button onClick={addStopWord} className="btn-primary" style={{ whiteSpace: "nowrap", padding: "8px 16px", fontSize: 12 }}>Добавить</button>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>
                При совпадении слова в сообщении клиента — карточка отправляется с флагом ⛔ без AI-ответа.
              </p>
            </div>
          )}

          {/* Blacklist */}
          {card("🚫 Черный список",
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={newPhone} onChange={e => setNewPhone(e.target.value)}
                    placeholder="+996 700 000 000" style={{ ...inputStyle, minWidth: 200 }} />
                  <input value={newReason} onChange={e => setNewReason(e.target.value)}
                    placeholder="Причина (необязательно)" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                  <button onClick={addBlacklist} className="btn-primary" style={{ padding: "8px 16px", fontSize: 12 }}>Добавить</button>
                </div>
              </div>
              {blacklist.length === 0 ? (
                <p style={{ color: "var(--text-3)", fontSize: 13 }}>Черный список пуст</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-3)" }}>
                      <th style={{ padding: "5px 12px", textAlign: "left", fontWeight: 500 }}>Телефон</th>
                      <th style={{ padding: "5px 12px", textAlign: "left", fontWeight: 500 }}>Причина</th>
                      <th style={{ padding: "5px 12px", textAlign: "left", fontWeight: 500 }}>Добавлен</th>
                      <th style={{ padding: "5px 12px" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {blacklist.map(e => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "7px 12px", fontFamily: "monospace" }}>{e.phone}</td>
                        <td style={{ padding: "7px 12px", color: "var(--text-2)" }}>{e.reason || "—"}</td>
                        <td style={{ padding: "7px 12px", color: "var(--text-3)", fontSize: 11 }}>{e.created_at}</td>
                        <td style={{ padding: "7px 12px", textAlign: "right" }}>
                          <button onClick={() => removeBlacklist(e.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 12 }}>
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </AppShell>
  );
}
