"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Hint } from "@/components/dashboard";
import { apiGet, apiJson } from "@/lib/api";
import { useCopilotPageContext } from "@/lib/copilot-context";
import {
  Bot, User, Send, ImagePlus, Video, X, RefreshCw, Sparkles,
  Rocket, BarChart2, Eraser, Copy,
} from "lucide-react";

type LabMsg = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  tokens?: number;
  cost?: number;
  latency?: number;
  model?: string;
};

type ModelPrice = { model: string; input_cost_per_1m: number; output_cost_per_1m: number };

type MistakeCategory = { label: string; count: number };
type MistakeResult = {
  total_dialogues: number;
  edited_count: number;
  categories: MistakeCategory[];
  suggested_prompt_changes: string;
  expected_improvement: string;
};

const CATEGORY_COLORS = ["#2563EB", "#7C3AED", "#DB2777", "#DC2626", "#D97706", "#059669", "#0891B2"];

const IMPROVE_PROMPT_TEMPLATE = `Ты — эксперт по созданию системных промптов для AI-ботов, разговорный дизайнер, бизнес-аналитик и специалист по клиентскому сервису.

Я разрабатываю AI-бота для компании Demi Results.

Ниже я передам текущий системный промпт бота. Твоя задача — глубоко проанализировать его и создать улучшенную production-ready версию, которую можно сразу использовать в реальной работе.

ВАЖНО:

Не удаляй важные правила компании.

Не меняй фактические данные самостоятельно.

Не придумывай цены, адреса, услуги, график, условия доставки, правила CRM или другую информацию, которой нет в исходном промпте.

Если найдёшь противоречие или правило, по которому требуется решение владельца, не выбирай самостоятельно. Пометь его:

[НУЖНО РЕШЕНИЕ ВЛАДЕЛЬЦА]

Сохрани философию Demi Results:

— клиент должен чувствовать, что его услышали;
— бот не должен давить;
— бот не должен навязывать консультацию;
— сначала нужно ответить на вопрос клиента;
— общение должно быть коротким, живым, тёплым и естественным;
— бот должен писать как внимательный сотрудник, а не как робот;
— нельзя выдумывать информацию;
— нельзя ставить диагноз;
— нельзя назначать лечение;
— нельзя гарантировать результат;
— подбор домашнего ухода и лечение должны быть правильно разделены;
— при необходимости вопрос должен передаваться skin expert, менеджеру или дерматологу.

Проведи работу по этапам.

ЭТАП 1. АНАЛИЗ

Проанализируй текущий промпт и найди:

— повторяющиеся правила;
— противоречия;
— слишком длинные части;
— неясные инструкции;
— правила, которые AI может понять неправильно;
— отсутствующие сценарии;
— места, где бот может начать выдумывать;
— места, где бот может отвечать слишком роботизированно;
— места, где бот может слишком рано предлагать консультацию;
— возможные ошибки в CRM-логике.

Не изменяй промпт на этом этапе.

Сначала покажи краткий аудит.

ЭТАП 2. УТОЧНЕНИЯ

Если есть важные противоречия, задай мне только действительно необходимые вопросы.

Не задавай вопросы, ответы на которые уже есть в текущем промпте.

Задавай по одному вопросу за раз.

Если критических вопросов нет, сразу переходи дальше.

ЭТАП 3. СОЗДАНИЕ НОВОГО ПРОМПТА

Создай полный улучшенный системный промпт.

Он должен быть:

— понятным для AI;
— структурным;
— без лишних повторений;
— максимально однозначным;
— пригодным для реальной работы;
— удобным для дальнейшего редактирования;
— масштабируемым;
— устойчивым к нестандартным сообщениям клиентов.

Используй понятные разделы.

Рекомендуемая структура:

1. Роль бота.

2. Информация о Demi Results.

3. Главная цель.

4. Философия общения.

5. Стиль сообщений.

6. Правила естественного общения.

7. Что запрещено.

8. Приоритеты при ответе.

9. Определение намерения клиента.

10. Логика подбора ухода.

11. Разделение skin expert и дерматолога.

12. Работа с фотографиями.

13. Работа с ценами и бюджетом.

14. Адрес и доставка.

15. Запись на консультацию.

16. CRM-логика.

17. Передача клиента сотруднику.

18. Работа с отсутствием данных.

19. Нестандартные ситуации.

20. Примеры правильных ответов.

21. Внутренняя проверка перед отправкой сообщения.

22. Главное правило.

Не добавляй лишнюю теорию.

Все инструкции должны быть написаны так, чтобы AI понимал, что именно делать в реальном диалоге.

ЭТАП 4. ПРОВЕРКА

После создания промпта проверь его минимум по следующим сценариям:

— клиент написал только «+»;

— клиент попросил адрес;

— клиент хочет купить товар;

— клиент спрашивает цену;

— цена отсутствует;

— клиент спрашивает наличие;

— наличие неизвестно;

— клиент хочет подобрать уход;

— клиент описал акне;

— клиент написал о розацеа;

— клиент прислал фотографию;

— клиент хочет лечение;

— клиенту нужен только домашний уход;

— клиент пишет, что ничего не помогло;

— клиент просит гарантию;

— клиент пишет, что дорого;

— клиент хочет полный уход за маленький бюджет;

— клиент хочет записаться;

— клиент написал после рабочего времени;

— клиент отказался;

— клиент написал «я подумаю»;

— клиент перестал отвечать;

— написал поставщик или партнёр;

— клиент конфликтует;

— информации недостаточно.

Для каждого сценария проверь:

— ответил ли бот на прямой вопрос;

— не выдумал ли данные;

— не поставил ли диагноз;

— не пообещал ли результат;

— не предложил ли консультацию слишком рано;

— не задал ли слишком много вопросов;

— звучит ли ответ естественно;

— правильно ли определено следующее действие.

ЭТАП 5. ФИНАЛЬНЫЙ РЕЗУЛЬТАТ

После анализа выдай:

1. Краткий список найденных проблем.

2. Вопросы владельцу, только если без них нельзя принять решение.

3. Полный улучшенный системный промпт в одном кодовом блоке.

4. Список изменений по сравнению с исходной версией.

5. Список рекомендаций для будущего улучшения.

Не сокращай важные правила ради краткости.

Не изменяй бизнес-логику без моего подтверждения.

Не выдавай предположения за факты.

Текущий системный промпт Demi Results:

<<<НАЧАЛО ТЕКУЩЕГО ПРОМПТА>>>

{{CURRENT_PROMPT}}

<<<КОНЕЦ ТЕКУЩЕГО ПРОМПТА>>>`;

function Bar({ value, max, color = "var(--primary)" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 10, background: "var(--bg-3)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 5, transition: "width 600ms ease" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--text-2)", minWidth: 22, textAlign: "right", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const textAreaStyle: CSSProperties = {
  width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)",
  color: "var(--text)", borderRadius: 8, padding: "10px 12px", fontSize: 12,
  fontFamily: "var(--mono)", lineHeight: 1.6, resize: "vertical",
  boxSizing: "border-box", outline: "none",
};

const panelStyle: CSSProperties = {
  background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12,
  padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
};

function panelTitle(text: string) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{text}</div>;
}

export default function LaboratoryPage() {
  // Chat
  const [history, setHistory] = useState<LabMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Draft settings — none of this touches production until "Задеплоить" is clicked
  const [prices, setPrices] = useState<ModelPrice[]>([]);
  const [model, setModel] = useState("");
  const [testPrompt, setTestPrompt] = useState("");
  const [promptLoaded, setPromptLoaded] = useState(false);
  const [storeMemory, setStoreMemory] = useState("");
  const [clientMemory, setClientMemory] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Per-message "edit with AI" popover
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  useCopilotPageContext(model ? { selectedModel: model } : undefined);

  useEffect(() => {
    apiGet<ModelPrice[]>("/admin/model-pricing").then(list => {
      setPrices(list);
      if (list.length) setModel(list.find(p => p.model === "gpt-5.1")?.model || list[0].model);
    }).catch(() => {});
    apiGet<{ prompt: string }>("/admin/bot-prompt").then(d => { setTestPrompt(d.prompt); setPromptLoaded(true); }).catch(() => {});
    apiGet<{ memory: string }>("/admin/bot-memory").then(d => setStoreMemory(d.memory)).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  const selectedPrice = prices.find(p => p.model === model);
  const totals = useMemo(
    () => history.reduce((acc, m) => m.role === "assistant"
      ? { tokens: acc.tokens + (m.tokens || 0), cost: acc.cost + (m.cost || 0) }
      : acc, { tokens: 0, cost: 0 }),
    [history]
  );

  function attachImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImages(prev => [...prev, String(reader.result)]);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function attachVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    // OpenAI chat completions can't analyze video content — we only pass the filename as
    // context so the bot can react conversationally, without pretending to "see" the video.
    setInput(prev => `${prev}${prev ? " " : ""}[клиент прислал видео «${file.name}», содержимое видео недоступно для анализа] `);
  }

  async function send() {
    const text = input.trim();
    if ((!text && images.length === 0) || loading) return;
    const sentImages = images;
    const newHistory: LabMsg[] = [...history, { role: "user", content: text || "[изображение]", images: sentImages }];
    setHistory(newHistory);
    setInput("");
    setImages([]);
    setLoading(true);
    const memory = [storeMemory.trim(), clientMemory.trim() && `ПАМЯТЬ О КЛИЕНТЕ (эта тестовая сессия):\n${clientMemory.trim()}`]
      .filter(Boolean).join("\n\n---\n");
    try {
      const res = await apiJson<{ ok: boolean; reply: string; tokens?: number; cost?: number; latency_ms?: number; model?: string }>(
        "/admin/ai-test", "POST",
        {
          message: text || "[клиент прислал фото]",
          history: history.map(m => ({ role: m.role, content: m.content })),
          model,
          temperature: 0.5,
          system_prompt: promptLoaded ? testPrompt : "",
          memory,
          is_working_hours: true,
          lang: "ru",
          images: sentImages,
        }
      );
      setHistory(prev => [...prev, {
        role: "assistant", content: res.reply,
        tokens: res.tokens, cost: res.cost, latency: res.latency_ms, model: res.model,
      }]);
    } catch {
      setHistory(prev => [...prev, { role: "assistant", content: "❌ Ошибка запроса" }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitEdit(idx: number) {
    if (!editText.trim() || editBusy) return;
    const precedingUser = [...history.slice(0, idx)].reverse().find(m => m.role === "user");
    setEditBusy(true);
    try {
      const res = await apiJson<{ reply: string; tokens: number; cost: number }>(
        "/admin/lab/edit-reply", "POST",
        {
          original_reply: history[idx].content,
          client_message: precedingUser?.content || "",
          edit_prompt: editText,
        }
      );
      setHistory(prev => prev.map((m, i) => i === idx
        ? { ...m, content: res.reply, tokens: (m.tokens || 0) + res.tokens, cost: (m.cost || 0) + res.cost }
        : m));
      setEditingIdx(null);
      setEditText("");
    } finally {
      setEditBusy(false);
    }
  }

  async function copyImprovePrompt() {
    const text = IMPROVE_PROMPT_TEMPLATE.replace("{{CURRENT_PROMPT}}", () => testPrompt);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function deployPrompt() {
    if (!window.confirm("Заменить боевой промпт бота этим текстом? Изменение сразу повлияет на реальных клиентов.")) return;
    setDeploying(true);
    try {
      await apiJson("/admin/bot-prompt", "PATCH", { prompt: testPrompt });
      setDeployed(true);
      setTimeout(() => setDeployed(false), 2500);
    } finally {
      setDeploying(false);
    }
  }

  return (
    <AppShell title="Лаборатория" subtitle="Песочница для тестирования бота — ничего здесь не влияет на прод, кроме кнопки «Задеплоить»">
      <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
        {/* ── Chat sandbox ── */}
        <div style={panelStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {panelTitle("Тестовый чат с ботом")}
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-3)" }}>
              <span>🪙 сессия: {totals.tokens} ток.</span>
              <span style={{ color: "#059669" }}>${totals.cost.toFixed(5)}</span>
            </div>
          </div>

          <div style={{
            minHeight: 360, maxHeight: 560, overflowY: "auto",
            background: "var(--bg-3)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {history.length === 0 && (
              <div style={{ color: "var(--text-3)", fontSize: 13, textAlign: "center", marginTop: 60 }}>
                Напишите сообщение клиента — бот ответит с черновиком промпта/памяти из панели справа
              </div>
            )}
            {history.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 3 }}>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>
                  {m.role === "user" ? <><User size={9} /> Тестовый клиент</> : <><Bot size={9} /> ИИ бот</>}
                </div>
                {m.images && m.images.length > 0 && (
                  <div style={{ display: "flex", gap: 4 }}>
                    {m.images.map((img, j) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={j} src={img} alt="" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                    ))}
                  </div>
                )}
                <div style={{
                  background: m.role === "user" ? "var(--primary)" : "var(--bg-2)",
                  color: m.role === "user" ? "#fff" : "var(--text)",
                  borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  padding: "8px 12px", fontSize: 13, maxWidth: "85%",
                  border: m.role === "assistant" ? "1px solid var(--border)" : "none",
                  whiteSpace: "pre-wrap", lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 1 }}>
                    {m.tokens != null && (
                      <div style={{ fontSize: 10, color: "var(--text-3)", display: "flex", gap: 8 }}>
                        <span style={{ color: "var(--primary)" }}>🪙 {m.tokens}</span>
                        {m.cost != null && <span style={{ color: "#059669" }}>${m.cost.toFixed(5)}</span>}
                        {m.latency != null && <span style={{ color: "#D97706" }}>⚡{m.latency}ms</span>}
                      </div>
                    )}
                    <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: 10 }}
                      onClick={() => { setEditingIdx(editingIdx === i ? null : i); setEditText(""); }}>
                      <Sparkles size={10} /> Изменить с помощью ИИ
                    </button>
                  </div>
                )}
                {editingIdx === i && (
                  <div style={{ display: "flex", gap: 6, width: "85%", marginTop: 2 }}>
                    <input value={editText} onChange={e => setEditText(e.target.value)}
                      placeholder="Как исправить этот ответ?"
                      onKeyDown={e => { if (e.key === "Enter") submitEdit(i); }}
                      style={{ ...textAreaStyle, fontFamily: "var(--sans)", padding: "6px 10px", flex: 1 }} />
                    <button className="btn-primary" style={{ padding: "6px 12px", fontSize: 11 }}
                      onClick={() => submitEdit(i)} disabled={editBusy || !editText.trim()}>
                      {editBusy ? "…" : "OK"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: "12px 12px 12px 2px", padding: "8px 14px",
                fontSize: 13, color: "var(--text-3)", alignSelf: "flex-start",
              }}>
                <RefreshCw size={12} style={{ animation: "spin .8s linear infinite" }} /> печатает…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {images.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {images.map((img, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%",
                      background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-2)",
                      fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={attachImage} style={{ display: "none" }} />
            <input ref={videoRef} type="file" accept="video/*" onChange={attachVideo} style={{ display: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={loading} title="Прикрепить фото (реально анализируется)" style={{ padding: "8px 10px" }}>
                <ImagePlus size={15} />
              </button>
              <button className="btn-ghost" onClick={() => videoRef.current?.click()} disabled={loading} title="Прикрепить видео (только имя файла — содержимое не анализируется)" style={{ padding: "8px 10px" }}>
                <Video size={15} />
              </button>
            </div>
            <textarea rows={2} placeholder="Сообщение тестового клиента… (Ctrl+Enter)"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) send(); }}
              disabled={loading}
              style={{ flex: 1, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "8px 12px", fontSize: 13, resize: "none", fontFamily: "var(--sans)", outline: "none" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn-primary" onClick={send} disabled={loading || (!input.trim() && images.length === 0)} style={{ padding: "8px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Send size={13} /> Отпр.
              </button>
              <button className="btn-ghost" onClick={() => setHistory([])} style={{ padding: "6px 14px", fontSize: 12 }}>
                <X size={13} /> Очистить
              </button>
            </div>
          </div>
        </div>

        {/* ── Settings column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={panelStyle}>
            {panelTitle("Модель")}
            <select value={model} onChange={e => setModel(e.target.value)}
              style={{ width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 8, padding: "8px 10px", fontSize: 12, outline: "none" }}>
              {prices.map(p => <option key={p.model} value={p.model}>{p.model}</option>)}
            </select>
            {selectedPrice && (
              <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                Вход: <b style={{ color: "var(--text-2)" }}>${selectedPrice.input_cost_per_1m.toFixed(2)}</b> / 1M ·
                {" "}Выход: <b style={{ color: "var(--text-2)" }}>${selectedPrice.output_cost_per_1m.toFixed(2)}</b> / 1M
              </div>
            )}
          </div>

          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              {panelTitle("Промпт (черновик)")}
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-ghost" style={{ padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                  onClick={copyImprovePrompt} disabled={!promptLoaded} title="Скопировать промпт вместе с инструкцией для улучшения — вставьте в ChatGPT или Claude">
                  <Copy size={11} /> {copied ? "✓ Скопировано" : "Скопировать промпт для улучшения бота"}
                </button>
                <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                  onClick={deployPrompt} disabled={deploying || !promptLoaded}>
                  <Rocket size={11} /> {deploying ? "…" : deployed ? "✓ Задеплоено" : "Задеплоить в прод"}
                </button>
              </div>
            </div>
            <Hint>«Скопировать промпт для улучшения» — берёт этот черновик и упаковывает в готовый запрос для ChatGPT/Claude, чтобы получить улучшенную версию. «Задеплоить в прод» сразу заменит настоящий промпт бота этим текстом.</Hint>
            <textarea value={testPrompt} onChange={e => setTestPrompt(e.target.value)} rows={12}
              placeholder={promptLoaded ? "" : "Загрузка..."} style={textAreaStyle} />
          </div>

          <div style={panelStyle}>
            {panelTitle("Память о магазине (черновик)")}
            <textarea value={storeMemory} onChange={e => setStoreMemory(e.target.value)} rows={6} style={textAreaStyle} />
          </div>

          <div style={panelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {panelTitle("Память о клиенте (эта сессия)")}
              <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => setClientMemory("")}>
                <Eraser size={11} /> Стереть
              </button>
            </div>
            <textarea value={clientMemory} onChange={e => setClientMemory(e.target.value)} rows={5}
              placeholder="Например: клиенту 28 лет, беспокоит акне, уже была консультация 3 дня назад…"
              style={textAreaStyle} />
          </div>
        </div>
      </div>

      <MistakeAnalysis />
    </AppShell>
  );
}

function MistakeAnalysis() {
  const [limit, setLimit] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MistakeResult | null>(null);

  async function run() {
    setLoading(true);
    try {
      const r = await apiGet<MistakeResult>(`/admin/lab/mistake-analysis?limit=${limit}`);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }

  const maxCount = Math.max(1, ...(result?.categories.map(c => c.count) || [0]));

  return (
    <div style={{ padding: "0 16px 16px" }}>
      <div style={panelStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart2 size={14} />
            {panelTitle("Анализ ошибок бота")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>Последние</span>
            <input type="number" min={10} max={500} step={10} value={limit}
              onChange={e => setLimit(parseInt(e.target.value) || 100)}
              style={{ width: 64, background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none" }} />
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>диалогов</span>
            <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }} onClick={run} disabled={loading}>
              {loading ? "Анализирую…" : "Проанализировать"}
            </button>
          </div>
        </div>

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
            <Hint>
              Из последних <b style={{ color: "var(--text-2)" }}>{result.total_dialogues}</b> диалогов менеджер
              исправил бота в <b style={{ color: "var(--text-2)" }}>{result.edited_count}</b> случаях.
              {result.edited_count === 0 && " Правок не найдено — анализировать нечего."}
            </Hint>

            {result.categories.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.categories
                  .slice().sort((a, b) => b.count - a.count)
                  .map((c, i) => (
                    <div key={c.label}>
                      <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 3 }}>{c.label}</div>
                      <Bar value={c.count} max={maxCount} color={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    </div>
                  ))}
              </div>
            )}

            {result.suggested_prompt_changes && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Предлагаемые изменения промпта
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6, background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                  {result.suggested_prompt_changes}
                </div>
                <Hint style={{ marginTop: 6 }}>
                  Это только идея — промпт сам не поменяется. Скопируйте нужное в черновик слева и проверьте в тестовом чате,
                  прежде чем деплоить.
                </Hint>
              </div>
            )}

            {result.expected_improvement && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Оценка эффекта (экспертная оценка ИИ, не измеренная метрика)
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>{result.expected_improvement}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
