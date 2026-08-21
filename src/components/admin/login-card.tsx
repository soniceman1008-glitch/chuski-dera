import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { LogoMark } from "@/components/logo-mark";

export function AdminLoginCard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim(),
        });
        if (err) throw new Error(err.message ?? "Sign-up failed");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message ?? "Sign-in failed");
      }
      await navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-fg">
            <LogoMark />
          </span>
          <div>
            <p className="font-display text-2xl tracking-wide">Chuski Dera</p>
            <p className="text-xs tracking-[0.16em] text-muted uppercase">Admin</p>
          </div>
        </div>
        <h1 className="mt-6 text-lg font-semibold">{mode === "in" ? "Sign in" : "Create owner account"}</h1>
        <p className="mt-1 text-sm text-muted">First account becomes the restaurant owner.</p>
        {authEnabled ? (
          <>
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              {mode === "up" && (
                <>
                  <label className="block text-xs text-muted" htmlFor="admin-name">
                    Name
                  </label>
                  <input
                    id="admin-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-md bg-elevated px-3 text-sm text-fg outline-none ring-1 ring-border"
                  />
                </>
              )}
              <label className="block text-xs text-muted" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-md bg-elevated px-3 text-sm text-fg outline-none ring-1 ring-border"
              />
              <label className="block text-xs text-muted" htmlFor="admin-pass">
                Password
              </label>
              <input
                id="admin-pass"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-md bg-elevated px-3 text-sm text-fg outline-none ring-1 ring-border"
              />
              {error && <p className="text-sm text-primary">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-fg disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <button type="button" className="mt-3 text-sm text-muted hover:text-fg" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
            <div className="my-5 h-px bg-border" />
            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <button
                  key={p.providerId}
                  type="button"
                  onClick={() => signIn(p.providerId, { callbackURL: "/admin" })}
                  className="h-11 w-full rounded-md text-sm ring-1 ring-border hover:bg-elevated"
                >
                  Continue with {p.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/" className="mt-6 inline-block text-sm text-muted hover:text-primary">
          ← Back to website
        </Link>
      </div>
    </main>
  );
}
