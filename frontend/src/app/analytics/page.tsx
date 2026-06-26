"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { apiGet } from "@/lib/api";

type Analytics = {
  hourly: { hour: number; count: number }[];
  daily: { date: string; count: number }[];
  top_problems: { problem: string; count: number }[];
  stats: {
    total_leads: number;
    total_messages: number;
    total_approvals: number;
    approved: number;
    approved_as_is: number;
    rejected: number;
    consultation_confirmed: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    total_cost: number;
  };
};

function Bar({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 600ms ease" }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 24, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const PROBLEM_COLORS = [
  "#2563EB","#7C3AED","#DB2777","#DC2626","#D97706",
  "#059669","#0891B2","#4F46E5","#C2410C","#65A30D","#0369A1","#9333EA",
];

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Analytics>("/admin/analytics")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const maxHourly = data ? Math.max(...data.hourly.map(h => h.count), 1) : 1;
  const maxProblem = data ? Math.max(...data.top_problems.map(p => p.count), 1) : 1;
  const maxDaily = data ? Math.max(...data.daily.map(d => d.count), 1) : 1;

  const peakHour = data
    ? data.hourly.reduce((a, b) => (b.count > a.count ? b : a), { hour: 0, count: 0 })
    : null;

  return (
    <AppShell title="Аналитика" subtitle="Статистика диалогов · Проблемы клиентов · Активность по часам">
      <div style={{ padding: "24px", overflowY: "auto" }}>
        {loading ? (
          <div style={{ color: "var(--text-3)", fontSize: 14 }}>Загрузка...</div>
        ) : !data ? (
          <div style={{ color: "var(--text-3)", fontSize: 14 }}>Нет данных</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
              {[
                { label: "Лидов", value: data.stats.total_leads, color: "#2563EB" },
                { label: "Сообщений", value: data.stats.total_messages, color: "#7C3AED" },
                { label: "AI ответов", value: data.stats.total_approvals, color: "#059669" },
                { label: "Принято", value: data.stats.approved, color: "#D97706" },
                { label: "Без правок", value: data.stats.approved_as_is, color: "#0891B2" },
                { label: "Отклонено", value: data.stats.rejected, color: "#DC2626" },
                { label: "Записей", value: data.stats.consultation_confirmed, color: "#DB2777" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "var(--bg-2)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Token usage */}
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Расход токенов ИИ</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {[
                  { label: "Входящих токенов", value: data.stats.prompt_tokens.toLocaleString(), color: "#7C3AED" },
                  { label: "Исходящих токенов", value: data.stats.completion_tokens.toLocaleString(), color: "#2563EB" },
                  { label: "Всего токенов", value: data.stats.total_tokens.toLocaleString(), color: "#059669" },
                  { label: "Потрачено (USD)", value: `$${data.stats.total_cost.toFixed(4)}`, color: "#D97706" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Hourly activity */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Активность по часам</div>
                {peakHour && peakHour.count > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                    Пик: {peakHour.hour}:00–{peakHour.hour + 1}:00 · {peakHour.count} сообщ.
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                  {data.hourly.map(h => {
                    const pct = maxHourly > 0 ? (h.count / maxHourly) * 100 : 0;
                    const isDay = h.hour >= 9 && h.hour <= 21;
                    return (
                      <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }} title={`${h.hour}:00 — ${h.count}`}>
                        <div style={{
                          width: "100%", height: `${Math.max(pct, 2)}%`,
                          background: isDay ? "var(--primary)" : "var(--bg-4)",
                          borderRadius: "2px 2px 0 0", minHeight: 2,
                        }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
                  <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                </div>
              </div>

              {/* Daily volume */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Сообщений за 30 дней</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 14 }}>
                  {data.daily.length} активных дней
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
                  {data.daily.length === 0 ? (
                    <div style={{ color: "var(--text-3)", fontSize: 12, alignSelf: "center" }}>Нет данных</div>
                  ) : data.daily.map(d => {
                    const pct = maxDaily > 0 ? (d.count / maxDaily) * 100 : 0;
                    return (
                      <div key={d.date} style={{ flex: 1 }} title={`${d.date}: ${d.count}`}>
                        <div style={{
                          width: "100%", height: `${Math.max(pct, 2)}%`,
                          background: "#059669", borderRadius: "2px 2px 0 0", minHeight: 2,
                        }} />
                      </div>
                    );
                  })}
                </div>
                {data.daily.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
                    <span>{data.daily[0]?.date?.slice(5)}</span>
                    <span>{data.daily[data.daily.length - 1]?.date?.slice(5)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Top problems */}
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Частые проблемы клиентов</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 16 }}>
                На основе AI-классификации из {data.stats.total_approvals} диалогов
              </div>
              {data.top_problems.length === 0 ? (
                <div style={{ color: "var(--text-3)", fontSize: 13 }}>Пока нет данных</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.top_problems.map((p, i) => (
                    <div key={p.problem}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--text)", fontWeight: 500 }}>{p.problem}</span>
                        <span style={{ color: "var(--text-3)" }}>
                          {Math.round((p.count / data.stats.total_approvals) * 100)}%
                        </span>
                      </div>
                      <Bar value={p.count} max={maxProblem} color={PROBLEM_COLORS[i % PROBLEM_COLORS.length]} />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}
