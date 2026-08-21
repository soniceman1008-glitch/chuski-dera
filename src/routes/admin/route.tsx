import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureStaff } from "@/lib/server/staff";
import { AdminShell } from "@/components/admin/shell";
import { AdminLoginCard } from "@/components/admin/login-card";

export const Route = createFileRoute("/admin")({ component: AdminGate });

function AdminGate() {
  const { user, isPending } = useCurrentUserState();
  const [staff, setStaff] = useState<"load" | "yes" | "no">("load");

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setStaff("load");
      return;
    }
    let cancelled = false;
    void ensureStaff()
      .then((res) => {
        if (!cancelled) setStaff(res.ok ? "yes" : "no");
      })
      .catch(() => {
        if (!cancelled) setStaff("no");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isPending]);

  if (isPending) {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted">Loading…</div>;
  }
  if (!user) return <AdminLoginCard />;
  if (staff === "load") {
    return <div className="grid min-h-dvh place-items-center text-sm text-muted">Checking access…</div>;
  }
  if (staff === "no") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm rounded-xl bg-surface p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-lg font-semibold">No admin access</h1>
          <p className="mt-2 text-sm text-muted">This account is signed in but is not staff.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary">
            Back to website
          </Link>
        </div>
      </main>
    );
  }
  return <AdminShell />;
}
