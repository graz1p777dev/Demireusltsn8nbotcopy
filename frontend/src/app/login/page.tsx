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
        width: 360, background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "36px 32px",
      }}>
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: "0 auto 14px",
            background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
            boxShadow: "0 0 20px rgba(59,130,246,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>
            Demi Results CRM
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>Войдите для продолжения</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 5, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Логин
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              style={{
                width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 9, padding: "10px 13px", fontSize: 14,
                fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "var(--text-3)", display: "block", marginBottom: 5, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: "100%", background: "var(--bg-3)", border: "1px solid var(--border)",
                color: "var(--text)", borderRadius: 9, padding: "10px 13px", fontSize: 14,
                fontFamily: "var(--sans)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
              color: "#fca5a5", borderRadius: 8, padding: "9px 13px", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ marginTop: 4, padding: "11px", fontSize: 14, borderRadius: 10 }}
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
