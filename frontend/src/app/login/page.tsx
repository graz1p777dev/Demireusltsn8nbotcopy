"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/backend/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Неверный логин или пароль");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", fontFamily: "var(--sans)",
    }}>
      <div style={{
        width: 380, background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "40px 36px",
        boxShadow: "0 4px 24px rgba(15,23,42,.08), 0 1px 4px rgba(15,23,42,.04)",
      }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            boxShadow: "0 4px 14px rgba(37,99,235,.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", letterSpacing: "-.02em" }}>
            Demi Results CRM
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 5 }}>
            Войдите для продолжения
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{
              fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 6,
              fontWeight: 500,
            }}>
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Введите логин"
              style={{
                width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 8, padding: "10px 13px", fontSize: 14,
                fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box",
                transition: "all 150ms",
              }}
            />
          </div>

          <div>
            <label style={{
              fontSize: 12, color: "var(--text-2)", display: "block", marginBottom: 6,
              fontWeight: 500,
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 8, padding: "10px 13px", fontSize: 14,
                fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box",
                transition: "all 150ms",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "var(--red-light)", border: "1px solid rgba(220,38,38,.25)",
              color: "var(--red)", borderRadius: 8, padding: "9px 13px", fontSize: 13,
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: 4, padding: "11px", fontSize: 14, borderRadius: 9, fontWeight: 600 }}
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
