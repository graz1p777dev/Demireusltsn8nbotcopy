// Server: go directly to Railway. Client: go through Vercel proxy.
const API_BASE =
  typeof window === "undefined"
    ? (process.env.BACKEND_API_URL || "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/backend");

export type Conversation = {
  id: number;
  amocrm_lead_id: string;
  chat_id: string | null;
  contact_id: string | null;
  ai_enabled: boolean;
  last_message_at: string | null;
  client: string | null;
  phone: string | null;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}

export async function apiJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json();
}
