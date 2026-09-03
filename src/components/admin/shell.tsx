import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LayoutDashboard, Menu, Phone, Settings, ShoppingBag, Users, X } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { adminLogout, getAdminSession } from "@/lib/server/admin-session";
import { newOrderCount } from "@/lib/server/orders";
import { subscribeCatalogSync } from "@/lib/catalog-sync";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/menu", label: "Menu", icon: Menu },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/calls", label: "Voice calls", icon: Phone },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export function AdminShell({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isLogin = pathname === "/admin/login";
  const [auth, setAuth] = useState<"loading" | "yes" | "no">("loading");
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (isLogin) {
      setAuth("yes");
      return;
    }
    let cancelled = false;
    void getAdminSession()
      .then((s) => {
        if (cancelled) return;
        if (s.authenticated) setAuth("yes");
        else {
          setAuth("no");
          void navigate({ to: "/admin/login" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAuth("no");
        void navigate({ to: "/admin/login" });
      });
    return () => {
      cancelled = true;
    };
  }, [isLogin, navigate, pathname]);

  useEffect(() => {
    if (auth !== "yes" || isLogin) return;
    let last = 0;
    let first = true;
    async function tick() {
      try {
        const data = await newOrderCount();
        setFresh(data.n);
        if (!first && data.maxId > last && data.n > 0) setFlash(true);
        last = data.maxId;
        first = false;
      } catch {
        /* ignore */
      }
    }
    void tick();
    const id = window.setInterval(tick, 12000);
    const unsub = subscribeCatalogSync((msg) => {
      if (msg === "orders") void tick();
    });
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [auth, isLogin]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(false), 6000);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (isLogin) {
    return <>{children ?? <Outlet />}</>;
  }

  if (auth === "loading" || auth === "no") {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">
        {auth === "loading" ? "Checking admin access…" : "Redirecting to login…"}
      </main>
    );
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium ${
              active ? "bg-primary text-primary-fg" : "text-muted hover:bg-elevated hover:text-fg"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
            {item.to === "/admin/orders" && fresh > 0 && (
              <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-fg px-1.5 text-[11px] font-bold text-bg">
                {fresh}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg text-fg">
      {flash && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-fg shadow-[var(--shadow-card)]">
          <Bell className="size-4" />
          New order received
        </div>
      )}
      <div className="flex min-h-dvh">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:block">
          <div className="flex h-16 items-center gap-2 px-4">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-fg">
              <LogoMark />
            </span>
            <span className="font-display text-xl tracking-wide">Admin</span>
          </div>
          {nav}
          <a
            href="/#menu"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-3 mb-3 flex h-11 items-center rounded-md px-3 text-sm font-medium text-muted hover:bg-elevated hover:text-fg"
          >
            Customer Menu Preview
          </a>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-border px-4">
            <button
              type="button"
              className="grid size-11 place-items-center rounded-md ring-1 ring-border md:hidden"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-4" />
            </button>
            <p className="hidden text-sm text-muted md:block">Chuski Dera dashboard</p>
            <div className="ml-auto flex items-center gap-3">
              <a
                href="/#menu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted hover:text-fg"
              >
                Customer Menu Preview
              </a>
              <button
                type="button"
                className="text-sm text-muted hover:text-fg"
                onClick={() => {
                  void adminLogout().then(() => navigate({ to: "/admin/login" }));
                }}
              >
                Log out
              </button>
            </div>
          </header>
          <div className="flex-1 p-4 sm:p-6">{children ?? <Outlet />}</div>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-bg/70" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64 bg-surface">
            <div className="flex h-16 items-center justify-between px-3">
              <span className="font-display text-xl tracking-wide">Admin</span>
              <button type="button" className="grid size-11 place-items-center" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            {nav}
            <a
              href="/#menu"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-3 mt-2 flex h-11 items-center rounded-md px-3 text-sm font-medium text-muted hover:bg-elevated hover:text-fg"
              onClick={() => setOpen(false)}
            >
              Customer Menu Preview
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
