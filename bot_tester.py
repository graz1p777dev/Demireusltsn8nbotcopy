"""
Local Bot Tester — запускать через:
    cd backend && railway run python ../bot_tester.py

Откроет http://localhost:8080
"""
import json
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

# ── deps ──────────────────────────────────────────────────────────────────────
try:
    from fastapi import FastAPI, Request
    from fastapi.responses import HTMLResponse, JSONResponse
    import uvicorn
    from openai import OpenAI
except ImportError:
    sys.exit("pip install fastapi uvicorn openai  (run inside backend/venv)")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

DEFAULT_SYSTEM_PROMPT = """Ты — Айым, помощник косметолога магазина уходовой косметики Demi Results.

Главная цель: помочь человеку, вызвать доверие, собрать информацию — и только после этого предложить консультацию.
Ты работаешь как заботливый помощник, а не продавец. После общения у клиента должно остаться ощущение: "Меня внимательно выслушали."

Перед каждым ответом проверяй:
✔ Показал ли я, что понял человека?
✔ Не тороплюсь ли сразу предлагать консультацию?
✔ Узнал ли я достаточно информации?

Правила:
- ПРИВЕТСТВИЕ: используй «Здравствуйте» ровно один раз — только если в истории нет ни одного предыдущего ответа ассистента. Если ассистент уже отвечал — не приветствуй повторно, продолжай разговор без «Здравствуйте»;
- отвечай на том языке, на котором пишет клиент;
- общайся уважительно, на Вы;
- отвечай коротко, тепло, естественно — как живой человек;
- используй 1-2 эмодзи уместно, не злоупотребляй;
- задавай максимум 1-2 вопроса за раз;
- ЗАПРЕЩЕНО: навязывать консультацию, писать длинные шаблонные ответы, торопить клиента, обесценивать проблему;
- не ставь диагнозы, не назначай лечение, не обещай результат;
- не выдумывай цены и свободные слоты;
- если клиент прислал фото кожи — коротко опиши что видишь и предложи консультацию;
- время по Бишкеку UTC+6; now_bishkek и date_bishkek — текущее время;
- если is_working_hours=false: мягко сообщи что работаем с 10:00 до 21:00; не предлагай слоты;
- Demi Results — уходовая косметика и домашний уход, не косметологические процедуры.

Логика диалога:

Шаг 0 — Если клиент только поздоровался (нет вопроса, нет упоминания проблемы, нет темы):
Ответь ТОЛЬКО коротким приветствием: «Здравствуйте 👋 Чем могу помочь?»
НЕ спрашивай сразу про кожу, не задавай уточняющих вопросов, не описывай что умеешь.

Шаг 1 — Собери информацию (не спеши):
Узнай: проблему кожи, как давно, что уже пробовали, есть ли диагноз, что хочет клиент.
Задавай вопросы постепенно, по 1-2 за раз.
Если клиент описал проблему кожи, но не назвал возраст — обязательно спроси возраст.

Шаг 3 — Предложи консультацию (только после понимания проблемы):
Говори так: "По Вашему описанию уже можно предположить несколько причин, но дистанционно поставить диагноз невозможно. Чтобы косметолог подобрал правильный уход — лучше провести консультацию."

Адрес: Байтик Баатыра 39, вход единый с кофейней Жираф.
"""

MODELS = [
    "gpt-4.1-mini",
    "gpt-4.1",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-5.1",
    "gpt-5.5",
    "o4-mini",
    "deepseek-chat",
]

HTML = r"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🤖 Bot Tester — Demi Results</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0f1117; --bg2:#161b27; --bg3:#1e2535;
    --border:#2a3147; --text:#e2e8f0; --text2:#94a3b8; --text3:#64748b;
    --primary:#6366f1; --primary-dim:#3d3f80;
    --green:#22c55e; --red:#ef4444; --yellow:#f59e0b;
    --radius:10px;
  }
  html,body{height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);font-size:13px}
  .layout{display:grid;grid-template-columns:340px 1fr;height:100vh;gap:0}

  /* ── Settings panel ── */
  .settings{background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
  .settings-header{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .settings-header h2{font-size:14px;font-weight:700;color:var(--text)}
  .badge{background:var(--primary-dim);color:#a5b4fc;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600}
  .settings-body{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:14px}
  .field{display:flex;flex-direction:column;gap:5px}
  .field label{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.05em}
  .field select,.field input[type=text],.field input[type=number]{background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:7px 10px;font-size:12px;width:100%;outline:none}
  .field select:focus,.field input:focus{border-color:var(--primary)}
  .field textarea{background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 10px;font-size:11.5px;width:100%;outline:none;resize:vertical;min-height:80px;line-height:1.5;font-family:inherit}
  .field textarea:focus{border-color:var(--primary)}
  .slider-row{display:flex;align-items:center;gap:10px}
  .slider-row input[type=range]{flex:1;accent-color:var(--primary)}
  .slider-val{min-width:32px;text-align:right;color:var(--primary);font-weight:700;font-size:12px}
  .toggle-row{display:flex;align-items:center;justify-content:space-between}
  .toggle{position:relative;width:36px;height:20px;flex-shrink:0}
  .toggle input{opacity:0;width:0;height:0}
  .toggle-slider{position:absolute;inset:0;background:var(--bg3);border:1px solid var(--border);border-radius:20px;cursor:pointer;transition:.2s}
  .toggle-slider:before{content:"";position:absolute;width:14px;height:14px;left:2px;top:2px;background:var(--text3);border-radius:50%;transition:.2s}
  .toggle input:checked+.toggle-slider{background:var(--primary);border-color:var(--primary)}
  .toggle input:checked+.toggle-slider:before{transform:translateX(16px);background:#fff}
  .divider{height:1px;background:var(--border)}
  .settings-footer{padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;border:none;transition:.15s}
  .btn-primary{background:var(--primary);color:#fff}
  .btn-primary:hover{background:#4f51c4}
  .btn-ghost{background:var(--bg3);color:var(--text2);border:1px solid var(--border)}
  .btn-ghost:hover{border-color:var(--text2);color:var(--text)}
  .btn-danger{background:#3b1212;color:var(--red);border:1px solid #5a1f1f}
  .btn-danger:hover{background:#5a1f1f}
  .footer-btns{display:flex;gap:8px}

  /* ── Chat panel ── */
  .chat{display:flex;flex-direction:column;height:100vh;background:var(--bg)}
  .chat-header{padding:14px 20px;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .chat-title{font-size:14px;font-weight:700}
  .model-tag{background:var(--bg3);border:1px solid var(--border);padding:3px 10px;border-radius:20px;font-size:11px;color:var(--text2)}
  .stats-bar{display:flex;gap:16px;padding:7px 20px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap}
  .stat{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text3)}
  .stat span{color:var(--text2);font-weight:600}
  .messages{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px}
  .msg{display:flex;flex-direction:column;max-width:78%}
  .msg.user{align-self:flex-end;align-items:flex-end}
  .msg.bot{align-self:flex-start;align-items:flex-start}
  .msg-label{font-size:10px;color:var(--text3);margin-bottom:3px;display:flex;align-items:center;gap:6px}
  .msg-label .meta{color:var(--text3)}
  .bubble{padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
  .msg.user .bubble{background:var(--primary);color:#fff;border-radius:14px 4px 14px 14px}
  .msg.bot .bubble{background:var(--bg3);border:1px solid var(--border);border-radius:4px 14px 14px 14px}
  .msg-tokens{font-size:10px;color:var(--text3);margin-top:4px;display:flex;gap:8px}
  .msg-tokens .tok{color:#6366f1}
  .msg-tokens .cost{color:var(--green)}
  .msg-tokens .lat{color:var(--yellow)}
  .thinking{display:flex;gap:4px;padding:10px 14px}
  .dot{width:7px;height:7px;background:var(--text3);border-radius:50%;animation:bounce .9s infinite}
  .dot:nth-child(2){animation-delay:.15s}
  .dot:nth-child(3){animation-delay:.3s}
  @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}
  .input-area{padding:14px 20px;border-top:1px solid var(--border);background:var(--bg2);flex-shrink:0}
  .input-row{display:flex;gap:10px;align-items:flex-end}
  .input-row textarea{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:10px 14px;font-size:13px;outline:none;resize:none;max-height:120px;line-height:1.5;font-family:inherit}
  .input-row textarea:focus{border-color:var(--primary)}
  .send-btn{background:var(--primary);border:none;border-radius:10px;color:#fff;padding:10px 16px;cursor:pointer;font-size:13px;font-weight:600;flex-shrink:0;transition:.15s;height:42px}
  .send-btn:hover{background:#4f51c4}
  .send-btn:disabled{opacity:.5;cursor:not-allowed}
  .empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text3);gap:10px}
  .empty-state .icon{font-size:48px}
  .empty-state p{font-size:13px}
  .key-warning{background:#2d1f0a;border:1px solid #6b4710;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#fbbf24;line-height:1.5}
  .debug-block{background:#0d1117;border:1px solid var(--border);border-radius:7px;padding:8px 10px;font-size:10.5px;color:var(--text3);font-family:monospace;white-space:pre-wrap;word-break:break-all;margin-top:6px;max-height:200px;overflow-y:auto;display:none}
  .debug-block.open{display:block}
  .debug-toggle{font-size:10px;color:var(--text3);cursor:pointer;margin-top:4px;user-select:none}
  .debug-toggle:hover{color:var(--text2)}
  .why-btn{color:#a5b4fc;margin-left:8px}
  .why-btn:hover{color:#c7d2fe}
  .why-block{display:none;background:#1a1d2e;border:1px solid var(--primary-dim);border-left:3px solid var(--primary);border-radius:7px;padding:9px 12px;font-size:11.5px;color:#c7d2fe;line-height:1.6;margin-top:6px;white-space:pre-wrap}
  .why-block.open{display:block}
</style>
</head>
<body>
<div class="layout">

  <!-- Settings -->
  <div class="settings">
    <div class="settings-header">
      <h2>⚙️ Настройки бота</h2>
      <span class="badge">LOCAL</span>
    </div>
    <div class="settings-body">

      <div class="field">
        <label>Модель</label>
        <select id="model">
          <option value="gpt-4.1-mini">gpt-4.1-mini (дешёвая)</option>
          <option value="gpt-4.1">gpt-4.1</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-5.1" selected>gpt-5.1 (простые вопросы)</option>
          <option value="gpt-5.5">gpt-5.5 (продажи/возражения)</option>
          <option value="o4-mini">o4-mini</option>
          <option value="deepseek-chat">deepseek-chat</option>
          <option value="__custom__">Другая (ввести)</option>
        </select>
        <input type="text" id="model-custom" placeholder="Название модели" style="display:none;margin-top:6px">
      </div>

      <div class="field">
        <label>Температура</label>
        <div class="slider-row">
          <input type="range" id="temperature" min="0" max="1" step="0.05" value="0.5">
          <span class="slider-val" id="temp-val">0.50</span>
        </div>
      </div>

      <div class="field">
        <label>Max tokens (0 = без лимита)</label>
        <input type="number" id="max-tokens" value="0" min="0" max="32000" step="100">
      </div>

      <div class="divider"></div>

      <div class="field">
        <label>Системный промпт</label>
        <textarea id="system-prompt" style="min-height:180px"></textarea>
      </div>

      <div class="field">
        <label>Память магазина</label>
        <textarea id="memory" placeholder="Доп. информация для бота (цены, акции, товары...)" style="min-height:80px"></textarea>
      </div>

      <div class="divider"></div>

      <div class="field">
        <label>Симуляция окружения</label>
        <div class="toggle-row" style="margin-bottom:8px">
          <span style="color:var(--text2);font-size:12px">Рабочее время (10:00–21:00)</span>
          <label class="toggle"><input type="checkbox" id="working-hours" checked><span class="toggle-slider"></span></label>
        </div>
        <div class="toggle-row">
          <span style="color:var(--text2);font-size:12px">Новый диалог (приветствие)</span>
          <label class="toggle"><input type="checkbox" id="new-dialog" checked><span class="toggle-slider"></span></label>
        </div>
      </div>

      <div class="field">
        <label>Язык клиента</label>
        <select id="lang">
          <option value="ru">🇷🇺 Русский</option>
          <option value="ky">🇰🇬 Кыргызский</option>
          <option value="kz">🇰🇿 Казахский</option>
          <option value="en">🇬🇧 English</option>
          <option value="uz">🇺🇿 Uzbek</option>
        </select>
      </div>

    </div>
    <div class="settings-footer">
      <div class="footer-btns">
        <button class="btn btn-danger" onclick="clearChat()">🗑 Очистить чат</button>
        <button class="btn btn-ghost" onclick="exportChat()">📋 Экспорт</button>
      </div>
    </div>
  </div>

  <!-- Chat -->
  <div class="chat">
    <div class="chat-header">
      <div>
        <div class="chat-title">🤖 Тестирование бота</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">Demi Results AI · локальный стенд</div>
      </div>
      <span class="model-tag" id="header-model">gpt-5.1</span>
    </div>
    <div class="stats-bar" id="stats-bar">
      <div class="stat">💬 Сообщений: <span id="s-msgs">0</span></div>
      <div class="stat">🪙 Всего токенов: <span id="s-tokens">0</span></div>
      <div class="stat">💵 Стоимость: $<span id="s-cost">0.0000</span></div>
      <div class="stat">⚡ Последний: <span id="s-lat">—</span></div>
    </div>
    <div class="messages" id="messages">
      <div class="empty-state" id="empty">
        <div class="icon">🤖</div>
        <p>Напишите первое сообщение клиента</p>
        <p style="font-size:11px">Бот ответит как Айым</p>
      </div>
    </div>
    <div class="input-area">
      <div class="input-row">
        <textarea id="user-input" rows="1" placeholder="Сообщение клиента..." onkeydown="handleKey(event)"></textarea>
        <button class="send-btn" id="send-btn" onclick="sendMessage()">➤</button>
      </div>
    </div>
  </div>

</div>

<script>
let history = [];
let totalTokens = 0, totalCost = 0, msgCount = 0;

const $ = id => document.getElementById(id);

// Init prompt
$('system-prompt').value = `__DEFAULT_PROMPT__`;

// Load full model list from OpenAI API
fetch('/models').then(r => r.json()).then(data => {
  if (!data.models || !data.models.length) return;
  const sel = $('model');
  const current = sel.value;
  // Keep the custom option, replace the rest
  sel.innerHTML = '';
  data.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    sel.appendChild(opt);
  });
  const custom = document.createElement('option');
  custom.value = '__custom__'; custom.textContent = 'Другая (ввести)';
  sel.appendChild(custom);
  sel.value = data.models.includes(current) ? current : (data.models.includes('gpt-5.1') ? 'gpt-5.1' : data.models[0]);
  $('header-model').textContent = sel.value;
}).catch(() => {});

// Model selector
$('model').addEventListener('change', function() {
  $('model-custom').style.display = this.value === '__custom__' ? 'block' : 'none';
  $('header-model').textContent = this.value === '__custom__' ? ($('model-custom').value || 'custom') : this.value;
});
$('model-custom').addEventListener('input', function() {
  $('header-model').textContent = this.value || 'custom';
});

// Temperature slider
$('temperature').addEventListener('input', function() {
  $('temp-val').textContent = parseFloat(this.value).toFixed(2);
});

function getModel() {
  return $('model').value === '__custom__' ? ($('model-custom').value || 'gpt-4.1-mini') : $('model').value;
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

// Auto-resize textarea
$('user-input').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

function addMessage(role, text, tokenInfo) {
  const empty = $('empty');
  if (empty) empty.remove();
  const msgs = $('messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  const label = role === 'user' ? '👤 Клиент' : '🤖 Айым';
  let metaHtml = '';
  if (tokenInfo) {
    metaHtml = `<div class="msg-tokens">
      <span class="tok">🪙 ${tokenInfo.total_tokens} tok</span>
      <span class="cost">$${tokenInfo.cost.toFixed(5)}</span>
      <span class="lat">⚡${tokenInfo.latency_ms}ms</span>
      <span class="meta">${tokenInfo.model}</span>
    </div>`;
    if (tokenInfo.debug) {
      const id = 'dbg-' + Date.now();
      metaHtml += `<span class="debug-toggle" onclick="toggleDebug('${id}')">▶ debug</span>
        <pre class="debug-block" id="${id}">${escHtml(JSON.stringify(tokenInfo.debug, null, 2))}</pre>`;
    }
    const whyId = 'why-' + Date.now();
    metaHtml += `<span class="debug-toggle why-btn" onclick="askWhy(this, '${whyId}')">💡 Почему такой ответ?</span>
      <div class="why-block" id="${whyId}"></div>`;
  }
  div.innerHTML = `
    <div class="msg-label">${label}</div>
    <div class="bubble">${escHtml(text)}</div>
    ${metaHtml}
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

async function askWhy(btn, id) {
  const block = document.getElementById(id);
  if (block.classList.contains('open')) { block.classList.remove('open'); return; }
  // Find the bot reply this button belongs to
  const bubble = btn.closest('.msg').querySelector('.bubble');
  const reply = bubble ? bubble.textContent : '';
  // Last user message before this reply
  let clientMsg = '';
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'assistant' && history[i].content === reply && i > 0) {
      clientMsg = history[i-1].content; break;
    }
  }
  if (!clientMsg && history.length) clientMsg = history[0].content;
  btn.textContent = '💡 Думаю...';
  try {
    const resp = await fetch('/why', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({client_message: clientMsg, reply, model: getModel(), system_prompt: $('system-prompt').value})});
    const data = await resp.json();
    block.textContent = data.explanation || data.error || 'Нет объяснения';
    block.classList.add('open');
  } catch(e) {
    block.textContent = 'Ошибка: ' + e.message;
    block.classList.add('open');
  }
  btn.textContent = '💡 Почему такой ответ?';
}

function toggleDebug(id) {
  const el = document.getElementById(id);
  const tog = el.previousElementSibling;
  el.classList.toggle('open');
  tog.textContent = el.classList.contains('open') ? '▼ debug' : '▶ debug';
}

function addThinking() {
  const msgs = $('messages');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'thinking';
  div.innerHTML = `<div class="msg-label">🤖 Айым</div><div class="bubble"><div class="thinking"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function sendMessage() {
  const input = $('user-input');
  const text = input.value.trim();
  if (!text) return;
  $('send-btn').disabled = true;
  input.value = '';
  input.style.height = 'auto';

  history.push({role:'user', content: text});
  addMessage('user', text);
  const thinking = addThinking();

  const payload = {
    history,
    model: getModel(),
    temperature: parseFloat($('temperature').value),
    max_tokens: parseInt($('max-tokens').value) || null,
    system_prompt: $('system-prompt').value,
    memory: $('memory').value,
    is_working_hours: $('working-hours').checked,
    minutes_since: $('new-dialog').checked ? 9999 : 5,
    lang: $('lang').value,
  };

  try {
    const resp = await fetch('/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
    const data = await resp.json();
    thinking.remove();

    if (data.error) {
      addMessage('bot', '❌ Ошибка: ' + data.error);
    } else {
      history.push({role:'assistant', content: data.reply});
      addMessage('bot', data.reply, data);

      totalTokens += data.total_tokens || 0;
      totalCost += data.cost || 0;
      msgCount++;

      $('s-msgs').textContent = msgCount;
      $('s-tokens').textContent = totalTokens.toLocaleString();
      $('s-cost').textContent = totalCost.toFixed(5);
      $('s-lat').textContent = data.latency_ms ? data.latency_ms + 'ms' : '—';
      $('header-model').textContent = data.model || getModel();
    }
  } catch(e) {
    thinking.remove();
    addMessage('bot', '❌ Сетевая ошибка: ' + e.message);
  }
  $('send-btn').disabled = false;
  input.focus();
}

function clearChat() {
  if (!confirm('Очистить историю чата?')) return;
  history = [];
  totalTokens = 0; totalCost = 0; msgCount = 0;
  $('s-msgs').textContent = '0';
  $('s-tokens').textContent = '0';
  $('s-cost').textContent = '0.0000';
  $('s-lat').textContent = '—';
  $('messages').innerHTML = `<div class="empty-state" id="empty"><div class="icon">🤖</div><p>Напишите первое сообщение клиента</p><p style="font-size:11px">Бот ответит как Айым</p></div>`;
}

function exportChat() {
  const lines = history.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
  const blob = new Blob([lines], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chat_' + new Date().toISOString().slice(0,19).replace(/:/g,'-') + '.txt';
  a.click();
}
</script>
</body>
</html>
"""

# Inject default prompt into HTML (escape backticks)
HTML_PAGE = HTML.replace(
    "__DEFAULT_PROMPT__",
    DEFAULT_SYSTEM_PROMPT.replace("`", "\\`").replace("${", "\\${").replace("</", "<\\/")
)

app = FastAPI()


@app.get("/", response_class=HTMLResponse)
async def index():
    return HTMLResponse(HTML_PAGE)


@app.post("/chat")
async def chat(request: Request):
    from time import perf_counter

    body = await request.json()
    model: str = body.get("model", "gpt-5.1")
    temperature: float = float(body.get("temperature", 0.5))
    max_tokens: int | None = body.get("max_tokens") or None
    system_prompt: str = body.get("system_prompt", DEFAULT_SYSTEM_PROMPT)
    memory: str = body.get("memory", "")
    is_working_hours: bool = body.get("is_working_hours", True)
    minutes_since: int = int(body.get("minutes_since", 9999))
    lang: str = body.get("lang", "ru")
    history: list[dict] = body.get("history", [])

    # Build system prompt with memory
    full_prompt = system_prompt
    if memory.strip():
        full_prompt += "\n\n---\nПАМЯТЬ МАГАЗИНА (используй эти данные при ответах):\n" + memory.strip()

    # Build time note (same as real bot)
    tz = ZoneInfo("Asia/Bishkek")
    now_bk = datetime.now(tz)
    time_note = f"[СИСТЕМНОЕ ВРЕМЯ БИШКЕК: {now_bk.strftime('%H:%M')} {now_bk.strftime('%d.%m.%Y')}]\n"
    if minutes_since <= 60:
        time_note += "[НЕ ПРИВЕТСТВУЙ — диалог продолжается, прошло менее 60 минут.]\n"
    else:
        time_note += "[ПРИВЕТСТВИЕ: если нет предыдущих ответов ассистента — поздоровайся один раз.]\n"
    if not is_working_hours:
        time_note += "[НЕРАБОЧЕЕ ВРЕМЯ. Сообщи что магазин работает с 10:00 до 21:00. НЕ предлагай консультацию.]\n"
    if lang and lang != "ru":
        lang_names = {"ky": "кыргызском", "kz": "казахском", "en": "английском", "uz": "узбекском"}
        label = lang_names.get(lang, lang)
        time_note += f"[ЯЗЫК КЛИЕНТА: {label} ({lang}). СТРОГО: пиши ответ ТОЛЬКО на {label} языке.]\n"

    # Wrap last user message with context
    messages_for_api = list(history[:-1])  # all except last
    last = history[-1] if history else {"role": "user", "content": ""}
    messages_for_api.append({
        "role": "user",
        "content": time_note + last["content"]
    })

    # Pick client
    is_deepseek = model.startswith("deepseek")
    if not OPENAI_API_KEY and not is_deepseek:
        return JSONResponse({"error": "OPENAI_API_KEY не задан. Запусти через: cd backend && railway run python ../bot_tester.py"})
    if is_deepseek and not DEEPSEEK_API_KEY:
        return JSONResponse({"error": "DEEPSEEK_API_KEY не задан."})

    if is_deepseek:
        client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")
    else:
        client = OpenAI(api_key=OPENAI_API_KEY)

    started = perf_counter()
    try:
        kwargs: dict = dict(
            model=model,
            temperature=temperature,
            messages=[{"role": "system", "content": full_prompt}] + messages_for_api,
        )
        if max_tokens:
            kwargs["max_tokens"] = max_tokens

        response = client.chat.completions.create(**kwargs)
        latency_ms = int((perf_counter() - started) * 1000)

        reply = (response.choices[0].message.content or "").strip()
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        total_tokens = usage.total_tokens if usage else 0

        # Cost estimate (rough)
        cost_map = {
            "gpt-4.1-mini": (0.40, 1.60),
            "gpt-4.1": (2.0, 8.0),
            "gpt-4o": (2.50, 10.0),
            "gpt-4o-mini": (0.15, 0.60),
            "gpt-5.1": (1.25, 10.0),
            "gpt-5.5": (5.0, 30.0),
            "o4-mini": (1.10, 4.40),
            "deepseek-chat": (0.07, 1.10),
        }
        in_cost, out_cost = cost_map.get(model, (1.0, 4.0))
        cost = (prompt_tokens / 1_000_000 * in_cost) + (completion_tokens / 1_000_000 * out_cost)

        return JSONResponse({
            "reply": reply,
            "model": model,
            "total_tokens": total_tokens,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cost": cost,
            "latency_ms": latency_ms,
            "debug": {
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
            }
        })
    except Exception as e:
        return JSONResponse({"error": str(e)})


@app.get("/models")
async def list_models():
    """All available OpenAI chat models."""
    if not OPENAI_API_KEY:
        return JSONResponse({"models": MODELS})
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        models = [
            m.id for m in client.models.list()
            if (m.id.startswith("gpt-") or m.id.startswith("o"))
            and not any(x in m.id for x in ("audio", "realtime", "transcribe", "tts", "image", "embedding", "moderation", "search", "instruct"))
        ]
        if DEEPSEEK_API_KEY:
            models.append("deepseek-chat")
        return JSONResponse({"models": sorted(models)})
    except Exception:
        return JSONResponse({"models": MODELS})


@app.post("/why")
async def why(request: Request):
    body = await request.json()
    client_message: str = body.get("client_message", "")
    reply: str = body.get("reply", "")
    system_prompt: str = body.get("system_prompt", "")

    if not OPENAI_API_KEY:
        return JSONResponse({"error": "OPENAI_API_KEY не задан"})

    client = OpenAI(api_key=OPENAI_API_KEY)
    system = (
        "Ты — AI-ассистент Айым магазина косметики Demi Results, объясняющий логику своего ответа. "
        "Тебе дают сообщение клиента и твой ответ. Объясни КРАТКО (2-4 строки, от первого лица) почему ты ответила именно так: "
        "какую цель преследовал ответ, почему задан этот вопрос или предложена консультация. "
        "Пиши просто и по делу, на русском. Без вступлений и заключений."
    )
    user = f"Твой системный промпт (сокращённо):\n{system_prompt[:2000]}\n\nСообщение клиента:\n{client_message}\n\nТвой ответ:\n{reply}"
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            temperature=0.3,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return JSONResponse({"explanation": (response.choices[0].message.content or "").strip()})
    except Exception as e:
        return JSONResponse({"error": str(e)})


if __name__ == "__main__":
    if not OPENAI_API_KEY:
        print("\n⚠️  OPENAI_API_KEY не задан!")
        print("Запусти так:\n  cd backend && railway run python ../bot_tester.py\n")
    print("🚀 Bot Tester запущен: http://localhost:8080")
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="warning")
