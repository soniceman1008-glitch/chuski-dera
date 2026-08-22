import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { adminLogin, getAdminSession } from "@/lib/server/admin-session";

export const Route = createFileRoute("/admin/login")({ component: AdminLoginPage });

function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(true);

  useState(() => {
    void getAdminSession()
      .then((s) => {
        setConfigured(s.configured);
        if (s.authenticated) void navigate({ to: "/admin/menu" });
      })
      .catch(() => setConfigured(false));
  });

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await adminLogin({ data: { password } });
      await navigate({ to: "/admin/menu" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fail");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <form onSubmit={onLogin} className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="font-display text-2xl tracking-wide">Chuski Dera</p>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Admin login</p>
        {!configured && (
          <p className="mt-4 text-sm text-primary">
            Vercel env mein <code className="text-fg">ADMIN_PASSWORD</code> set karo, phir redeploy.
          </p>
        )}
        <label className="mt-5 block text-xs text-muted" htmlFor="admin-pw">
          Password
        </label>
        <input
          id="admin-pw"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-11 w-full rounded-md bg-elevated px-3 text-sm ring-1 ring-border"
        />
        {error && <p className="mt-3 text-sm text-primary">{error}</p>}
        <button
          type="submit"
          disabled={busy || !configured}
          className="mt-4 h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-50"
        >
          {busy ? "…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
