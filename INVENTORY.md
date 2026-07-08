# Товароучёт (Inventory module)

Складской/POS-модуль (товары, документы, движение товара и денег, кассы и смены,
контрагенты, отчёты, настройки компании). Отдельное Next.js-приложение в папке
[`inventory/`](./inventory), которое монтируется в CRM по адресу
`https://demiresults.alihan-torebekov.kg/inventory` через Next.js **Multi-Zones**.

- **CRM** (`frontend/`) — «главная» зона. Отдаёт весь домен и делает rewrite
  `/inventory*` на деплой модуля товароучёта.
- **Inventory** (`inventory/`) — вторая зона. Next 16 + Tailwind 4 + shadcn/ui +
  Supabase. Все её маршруты уже лежат под `/inventory`, ассеты — под
  `/inventory-static` (`assetPrefix`), чтобы не конфликтовать с CRM.

Авторизация у модуля **своя** — Supabase Auth (отдельный вход), не CRM JWT.

## Как это связано в коде

- `frontend/next.config.ts` — rewrites `/inventory`, `/inventory/*`,
  `/inventory-static/*` → `INVENTORY_URL`. Если `INVENTORY_URL` не задан, rewrites
  выключены (CRM работает как раньше, ссылка в меню ведёт в 404).
- `frontend/src/middleware.ts` — `/inventory` и `/inventory-static` добавлены в
  `PUBLIC_PATHS`, чтобы CRM-мидлвар не редиректил зону на `/login`.
- `frontend/src/components/app-shell.tsx` — пункт меню «Товароучёт» (обычный `<a>`,
  т.к. переход между зонами — hard navigation).
- `inventory/next.config.ts` — `assetPrefix: "/inventory-static"` и
  `serverActions.allowedOrigins: ["demiresults.alihan-torebekov.kg"]`.

## Требования к Supabase (важно!)

Миграции в `inventory/supabase/migrations/` **предполагают, что в проекте уже есть**
функция `public.get_my_role()` и роль `owner` (из основного проекта Demi Results OS /
crm-system, файл `001_functions_core.sql`). Они её НЕ создают. Поэтому модуль нужно
подключать к тому Supabase-проекту, где эта функция и роли уже настроены, а не к
пустому проекту. (Локальный Postgres этого n8n-CRM — не Supabase и не подходит.)

Что создают миграции модуля:
- Таблицы `inventory_*` (categories, warehouses, suppliers, products, documents,
  document_items, stock_balances, stock_movements, registers, register_cashiers,
  shifts, doc_number_counters) + RLS `get_my_role() = 'owner'`.
- Storage-бакет `inventory-products` (публичное чтение, запись только owner).

## Деплой

### 1. Supabase
Применить миграции модуля к нужному проекту:
```bash
cd inventory
supabase link --project-ref <PROJECT_REF>   # проект Demi Results OS
supabase db push
```
Убедиться, что есть пользователь с ролью `owner`, под которым логиниться в модуль.

### 2. Inventory — отдельный проект на Vercel
- Import того же GitHub-репозитория, **Root Directory = `inventory`**.
- Env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Задеплоить. Запомнить production URL (например `https://demi-inventory.vercel.app`).

### 3. CRM — включить зону
В Vercel-проекте CRM (`frontend/`) добавить env:
```
INVENTORY_URL=https://demi-inventory.vercel.app
```
(без завершающего слэша) и передеплоить. После этого
`demiresults.alihan-torebekov.kg/inventory` открывает товароучёт, а пункт
«Товароучёт» в меню CRM ведёт туда же.

## Локальный запуск
```bash
# зона inventory на :3100
cd inventory && npm install && npm run dev -- -p 3100
# CRM на :3000, указывающий на неё
cd frontend && INVENTORY_URL=http://localhost:3100 npm run dev
```
Открыть http://localhost:3000/inventory. Для работы страниц нужны рабочие
`NEXT_PUBLIC_SUPABASE_*` в `inventory/.env.local`.
