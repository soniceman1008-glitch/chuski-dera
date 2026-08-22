import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/shell";
import { adminLogin, adminLogout, getAdminSession } from "@/lib/server/admin-session";

export const Route = createFileRoute("/admin")({ component: AdminGate });

function AdminGate() {
  const [state, setState] = useState<"loading" | "login" | "ok">("loading");
  const [configured, setConfigured] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const s = await getAdminSession();
      setConfigured(s.configured);
      setState(s.authenticated ? "ok" : "login");
    } catch {
      setState("login");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await adminLogin({ data: { password } });
      setPassword("");
      setState("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fail");
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await adminLogout();
    setState("login");
  }

  if (state === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">
        Checking admin access…
      </main>
    );
  }

  if (state === "login") {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <form onSubmit={onLogin} className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-[var(--shadow-card)]">
          <p className="font-display text-2xl tracking-wide">Chuski Dera</p>
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Admin login</p>
          {!configured && (
            <p className="mt-4 text-sm text-primary">
              Vercel → Environment Variables mein <code className="text-fg">ADMIN_PASSWORD</code> set karo, phir redeploy.
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void onLogout()}
        className="absolute top-3 right-3 z-20 rounded-md bg-elevated px-3 py-1.5 text-xs text-muted ring-1 ring-border"
      >
        Log out
      </button>
      <AdminShell />
    </div>
  );
}
