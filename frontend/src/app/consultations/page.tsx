"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { apiGet, apiJson } from "@/lib/api";
import { useCopilotPageContext } from "@/lib/copilot-context";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

type Slot = { time: string; status: "free" | "booked" | "blocked"; id: number | null; lead_id: number | null };
type DaySchedule = { date: string; label: string; is_working: boolean; slots: Slot[] };
type Schedule = { schedule: DaySchedule[]; interval_minutes: number };

const STATUS_LABEL: Record<string, string> = { free: "Свободно", booked: "Занято", blocked: "Закрыто" };
const STATUS_COLOR: Record<string, string> = {
  free: "var(--primary)",
  booked: "#DB2777",
  blocked: "var(--text-3)",
};
const STATUS_BG: Record<string, string> = {
  free: "rgba(37,99,235,0.08)",
  booked: "rgba(219,39,119,0.1)",
  blocked: "rgba(0,0,0,0.05)",
};

const DAYS = 21;
const PAGE_SIZE = 7;

export default function ConsultationsPage() {
  const [data, setData] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<Schedule>(`/admin/slots?days=${DAYS}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleDays = data?.schedule.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const totalPages = data ? Math.ceil(data.schedule.length / PAGE_SIZE) : 1;

  const toggleSlot = async (day: DaySchedule, slot: Slot) => {
    const key = `${day.date}:${slot.time}`;
    if (toggling === key) return;
    setToggling(key);

    try {
      if (slot.id && slot.status !== "free") {
        // free it → delete the DB row
        await apiJson(`/admin/slots/${slot.id}`, "DELETE");
      } else if (!slot.id || slot.status === "free") {
        // block it
        await apiJson("/admin/slots", "POST", { date: day.date, time: slot.time, status: "blocked" });
      }
      await load();
    } finally {
      setToggling(null);
    }
  };

  const workingDays = visibleDays.filter(d => d.is_working);
  const intervalMin = data?.interval_minutes ?? 90;

  useCopilotPageContext(
    visibleDays.length ? { visibleDateRange: [visibleDays[0]?.date, visibleDays[visibleDays.length - 1]?.date] } : undefined
  );

  return (
    <AppShell title="Консультации" subtitle="Расписание свободных слотов · каждая консультация 1–1.5 ч">
      <div style={{ padding: "20px 24px", overflowY: "auto", height: "100%" }}>
        {/* Legend + navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 16 }}>
            {(["free", "booked", "blocked"] as const).map(s => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[s] }} />
                {STATUS_LABEL[s]}
              </div>
            ))}
            <div style={{ fontSize: 12, color: "var(--text-3)" }}>
              Шаг: {intervalMin} мин
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-ghost" onClick={load} title="Обновить">
              <RefreshCw size={14} />
            </button>
            <button className="btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 12, color: "var(--text-3)", minWidth: 60, textAlign: "center" }}>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, DAYS)} из {DAYS} дн.
            </span>
            <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>Загрузка...</div>
        ) : !data ? (
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>Нет данных</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(workingDays.length, PAGE_SIZE)}, 1fr)`, gap: 12 }}>
            {visibleDays.map(day => (
              <div key={day.date} style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                opacity: day.is_working ? 1 : 0.4,
              }}>
                {/* Day header */}
                <div style={{
                  padding: "10px 12px",
                  background: day.is_working ? "var(--bg-3)" : "var(--bg-2)",
                  borderBottom: "1px solid var(--border)",
                  textAlign: "center",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: day.is_working ? "var(--text)" : "var(--text-3)" }}>
                    {day.label}
                  </div>
                  {!day.is_working && (
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>нерабочий</div>
                  )}
                  {day.is_working && (
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                      {day.slots.filter(s => s.status === "free").length} своб.
                    </div>
                  )}
                </div>

                {/* Slots */}
                {day.is_working && (
                  <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {day.slots.length === 0 ? (
                      <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", padding: "8px 0" }}>
                        Нет слотов
                      </div>
                    ) : (
                      day.slots.map(slot => {
                        const key = `${day.date}:${slot.time}`;
                        const isBusy = toggling === key;
                        return (
                          <button
                            key={slot.time}
                            onClick={() => toggleSlot(day, slot)}
                            disabled={isBusy || slot.status === "booked"}
                            title={
                              slot.status === "booked" ? "Занято клиентом" :
                              slot.status === "blocked" ? "Нажмите чтобы освободить" :
                              "Нажмите чтобы закрыть слот"
                            }
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: `1px solid ${slot.status === "free" ? "var(--border)" : STATUS_COLOR[slot.status]}`,
                              background: STATUS_BG[slot.status],
                              cursor: slot.status === "booked" ? "default" : "pointer",
                              opacity: isBusy ? 0.5 : 1,
                              transition: "all 150ms",
                              width: "100%",
                              textAlign: "left",
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[slot.status], fontFamily: "var(--mono)" }}>
                              {slot.time}
                            </span>
                            <span style={{ fontSize: 10, color: STATUS_COLOR[slot.status] }}>
                              {slot.status === "free" ? "свободно" : slot.status === "booked" ? "занято" : "закрыто"}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="hint" style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text-2)" }}>Как пользоваться:</strong>
          <br />
          Нажмите на <span style={{ color: STATUS_COLOR.free }}>свободный</span> слот — он станет <span style={{ color: STATUS_COLOR.blocked }}>закрытым</span> (не будет предлагаться клиентам).
          Нажмите снова — освободите обратно.
          <span style={{ color: STATUS_COLOR.booked }}> Занятые</span> слоты бронируют клиенты через бота.
        </div>
      </div>
    </AppShell>
  );
}
