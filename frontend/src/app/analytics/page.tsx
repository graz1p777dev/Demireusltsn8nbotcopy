"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { apiGet } from "@/lib/api";

type Analytics = {
  hourly: { hour: number; count: number }[];
  daily: { date: string; count: number }[];
  daily_tokens: { date: string; prompt_tokens: number; completion_tokens: number }[];
  top_problems: { problem: string; count: number }[];
  age_by_problem: { problem: string; age: string; count: number }[];
  usage_by_purpose: {
    purpose: string; prompt_tokens: number; completion_tokens: number;
    total_tokens: number; total_cost: number; calls: number;
  }[];
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

type LinePoint = { x: number; y: number; label: string; value: number };

function LineChart({
  series,
  height = 120,
}: {
  series: { points: LinePoint[]; color: string; label: string }[];
  height?: number;
}) {
  const W = 560;
  const H = height;
  const PAD = { top: 12, right: 12, bottom: 24, left: 36 };
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  if (!series.length || !series[0].points.length) return null;

  const allValues = series.flatMap(s => s.points.map(p => p.value));
  const maxVal = Math.max(...allValues, 1);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const toSvg = (p: LinePoint, totalPts: number, idx: number) => ({
    sx: PAD.left + (totalPts > 1 ? (idx / (totalPts - 1)) * pw : pw / 2),
    sy: PAD.top + ph - ((p.value - minVal) / range) * ph,
  });

  // Grid lines (4 horizontal)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + ph * (1 - f),
    label: Math.round(minVal + range * f).toLocaleString(),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: H, overflow: "visible" }}
    >
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y}
            stroke="var(--border)" strokeWidth={0.8} strokeDasharray="4 3" />
          <text x={PAD.left - 4} y={g.y + 4} fontSize={9} fill="var(--text-3)"
            textAnchor="end">{g.label}</text>
        </g>
      ))}

      {/* Series */}
      {series.map((s) => {
        const pts = s.points.map((p, i) => toSvg(p, s.points.length, i));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(" ");
        return (
          <g key={s.label}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.sx} cy={p.sy} r={3} fill="var(--bg-2)" stroke={s.color} strokeWidth={1.5}>
                <title>{s.points[i].label}: {s.points[i].value.toLocaleString()}</title>
              </circle>
            ))}
          </g>
        );
      })}

      {/* X axis labels */}
      {series[0].points.map((p, i, arr) => {
        const show = arr.length <= 12 || i % Math.ceil(arr.length / 8) === 0 || i === arr.length - 1;
        if (!show) return null;
        const { sx } = toSvg(p, arr.length, i);
        return (
          <text key={i} x={sx} y={H - 4} fontSize={9} fill="var(--text-3)" textAnchor="middle">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

const PURPOSE_LABELS: Record<string, string> = {
  sales_agent: "Продажи (агент)",
  sales_intent: "Определение намерения",
  lead_extractor: "Извлечение данных",
  ai_edit: "AI редактирование",
  hypervisor: "Гипервизор (резюме)",
};

const PURPOSE_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DB2777", "#0891B2", "#DC2626"];

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

  const maxProblem = data ? Math.max(...data.top_problems.map(p => p.count), 1) : 1;

  const peakHour = data
    ? data.hourly.reduce((a, b) => (b.count > a.count ? b : a), { hour: 0, count: 0 })
    : null;

  const hourlyPoints: LinePoint[] = (data?.hourly ?? []).map(h => ({
    x: h.hour, y: h.count, label: `${h.hour}:00`, value: h.count,
  }));

  const dailyMsgPoints: LinePoint[] = (data?.daily ?? []).map(d => ({
    x: 0, y: d.count, label: d.date.slice(5), value: d.count,
  }));

  const tokenMaxDate = data?.daily_tokens && data.daily_tokens.length > 0
    ? Math.max(...data.daily_tokens.flatMap(d => [d.prompt_tokens, d.completion_tokens]), 1)
    : 1;

  const dailyPromptPoints: LinePoint[] = (data?.daily_tokens ?? []).map(d => ({
    x: 0, y: d.prompt_tokens, label: d.date.slice(5), value: d.prompt_tokens,
  }));
  const dailyCompPoints: LinePoint[] = (data?.daily_tokens ?? []).map(d => ({
    x: 0, y: d.completion_tokens, label: d.date.slice(5), value: d.completion_tokens,
  }));

  void tokenMaxDate;

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

            {/* Token usage summary */}
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Расход токенов ИИ</div>
              {data.stats.total_cost === 0 && (
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>
                  Стоимость = $0 — установите OPENAI_INPUT_COST_PER_1M_TOKENS и OPENAI_OUTPUT_COST_PER_1M_TOKENS на Railway для расчёта
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                {[
                  { label: "Входящих токенов", value: data.stats.prompt_tokens.toLocaleString(), color: "#7C3AED" },
                  { label: "Исходящих токенов", value: data.stats.completion_tokens.toLocaleString(), color: "#2563EB" },
                  { label: "Всего токенов", value: data.stats.total_tokens.toLocaleString(), color: "#059669" },
                  { label: "Потрачено (USD)", value: data.stats.total_cost > 0 ? `$${data.stats.total_cost.toFixed(4)}` : "не настроено", color: "#D97706" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Line charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* Hourly activity */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Активность по часам</div>
                {peakHour && peakHour.count > 0 && (
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>
                    Пик: {peakHour.hour}:00–{peakHour.hour + 1}:00 · {peakHour.count} сообщ.
                  </div>
                )}
                <LineChart
                  series={[{ points: hourlyPoints, color: "#2563EB", label: "Сообщения" }]}
                  height={130}
                />
              </div>

              {/* Daily volume */}
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Сообщений за 30 дней</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>
                  {data.daily.length} активных дней
                </div>
                {dailyMsgPoints.length === 0 ? (
                  <div style={{ color: "var(--text-3)", fontSize: 12 }}>Нет данных</div>
                ) : (
                  <LineChart
                    series={[{ points: dailyMsgPoints, color: "#059669", label: "Сообщения" }]}
                    height={130}
                  />
                )}
              </div>
            </div>

            {/* Daily token chart */}
            {data.daily_tokens && data.daily_tokens.length > 0 && (
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Токены за 30 дней</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>Входящие vs исходящие</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 2, background: "#7C3AED", display: "inline-block" }} /> Входящие
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 2, background: "#2563EB", display: "inline-block" }} /> Исходящие
                    </span>
                  </div>
                </div>
                <LineChart
                  series={[
                    { points: dailyPromptPoints, color: "#7C3AED", label: "Входящие" },
                    { points: dailyCompPoints, color: "#2563EB", label: "Исходящие" },
                  ]}
                  height={140}
                />
              </div>
            )}

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

            {/* Usage by purpose */}
            {data.usage_by_purpose && data.usage_by_purpose.length > 0 && (
              <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Расход токенов по задачам</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 16 }}>
                  Разбивка по типу AI-запросов
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 60px",
                    gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)",
                    fontSize: 11, color: "var(--text-3)", fontWeight: 600,
                  }}>
                    <span>Задача</span>
                    <span style={{ textAlign: "right" }}>Входящих</span>
                    <span style={{ textAlign: "right" }}>Исходящих</span>
                    <span style={{ textAlign: "right" }}>Всего</span>
                    <span style={{ textAlign: "right" }}>Вызовов</span>
                  </div>
                  {data.usage_by_purpose.map((p, i) => {
                    const maxTok = Math.max(...data.usage_by_purpose.map(u => u.total_tokens), 1);
                    return (
                      <div key={p.purpose} style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 60px",
                        gap: 8, padding: "10px 0", borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                      }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: PURPOSE_COLORS[i % PURPOSE_COLORS.length] }}>
                            {PURPOSE_LABELS[p.purpose] || p.purpose}
                          </div>
                          <div style={{ marginTop: 3, height: 4, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ width: `${(p.total_tokens / maxTok) * 100}%`, height: "100%", background: PURPOSE_COLORS[i % PURPOSE_COLORS.length], borderRadius: 2 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 12, textAlign: "right", color: "var(--text-2)" }}>{p.prompt_tokens.toLocaleString()}</span>
                        <span style={{ fontSize: 12, textAlign: "right", color: "var(--text-2)" }}>{p.completion_tokens.toLocaleString()}</span>
                        <span style={{ fontSize: 12, textAlign: "right", fontWeight: 600, color: "var(--text)" }}>{p.total_tokens.toLocaleString()}</span>
                        <span style={{ fontSize: 12, textAlign: "right", color: "var(--text-3)" }}>{p.calls}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Age × Problem breakdown */}
            {data.age_by_problem && data.age_by_problem.length > 0 && (() => {
              // Build pivot: problems as rows, ages as columns
              const problems = [...new Set(data.age_by_problem.map(r => r.problem))];
              const ages = [...new Set(data.age_by_problem.map(r => r.age))].sort((a, b) => {
                if (a === "неизвестно") return 1;
                if (b === "неизвестно") return -1;
                return parseInt(a) - parseInt(b);
              });
              const lookup: Record<string, Record<string, number>> = {};
              for (const r of data.age_by_problem) {
                if (!lookup[r.problem]) lookup[r.problem] = {};
                lookup[r.problem][r.age] = (lookup[r.problem][r.age] || 0) + r.count;
              }
              const totals = problems.map(p => Object.values(lookup[p] || {}).reduce((s, v) => s + v, 0));
              const sortedProblems = problems.map((p, i) => ({ p, t: totals[i] })).sort((a, b) => b.t - a.t).map(x => x.p);
              return (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Возраст × Проблема
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-3)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>Проблема</th>
                          {ages.map(age => (
                            <th key={age} style={{ textAlign: "center", padding: "6px 8px", color: "var(--text-3)", fontWeight: 500, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                              {age === "неизвестно" ? "—" : age + " л."}
                            </th>
                          ))}
                          <th style={{ textAlign: "center", padding: "6px 8px", color: "var(--text-2)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Всего</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedProblems.map((prob, i) => {
                          const row = lookup[prob] || {};
                          const total = Object.values(row).reduce((s, v) => s + v, 0);
                          return (
                            <tr key={prob} style={{ background: i % 2 === 0 ? "var(--bg-2)" : "transparent" }}>
                              <td style={{ padding: "5px 8px", color: "var(--text)", whiteSpace: "nowrap" }}>{prob}</td>
                              {ages.map(age => (
                                <td key={age} style={{ textAlign: "center", padding: "5px 8px", color: row[age] ? "var(--text)" : "var(--text-3)" }}>
                                  {row[age] || "·"}
                                </td>
                              ))}
                              <td style={{ textAlign: "center", padding: "5px 8px", fontWeight: 600, color: "var(--primary)" }}>{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </AppShell>
  );
}
