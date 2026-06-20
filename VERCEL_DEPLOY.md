# Deploy Admin Panel to Vercel

This repository is a monorepo:

- `backend/` is FastAPI + Celery and should run on a server with PostgreSQL/Redis.
- `frontend/` is the Next.js admin panel and is the part deployed to Vercel.

## Vercel Project Settings

Import this GitHub repo into Vercel:

```text
https://github.com/graz1p777dev/Demireusltsn8nbotcopy
```

Set:

```text
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Install Command: npm install
Output Directory: .next
```

## Required Vercel Environment Variables

```env
BACKEND_API_URL=https://your-backend-domain.com
BACKEND_ADMIN_API_KEY=the_same_value_as_backend_ADMIN_API_KEY
NEXT_PUBLIC_API_BASE_URL=/api/backend
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`BACKEND_API_URL` must be a public HTTPS URL for the FastAPI backend.

Do not expose `BACKEND_ADMIN_API_KEY` as `NEXT_PUBLIC_*`. It is used only by the Next.js server-side proxy route:

```text
frontend/src/app/api/backend/[...path]/route.ts
```

Browser requests go to:

```text
/api/backend/admin/conversations
```

The Vercel serverless function forwards them to:

```text
$BACKEND_API_URL/admin/conversations
```

and adds:

```text
X-Admin-API-Key: $BACKEND_ADMIN_API_KEY
```

## Backend CORS

Because the browser talks to Vercel first, CORS is mostly handled by same-origin `/api/backend`.

Still set backend `CORS_ORIGINS` to the Vercel domain:

```env
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

## CLI Preview Deploy

From the repo root:

```bash
vercel deploy frontend -y
```

For production only when ready:

```bash
vercel deploy frontend --prod -y
```

