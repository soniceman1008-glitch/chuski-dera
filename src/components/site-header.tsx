import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { RESTAURANT } from "@/lib/menu";
import { itemCount, useCart } from "@/lib/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";

const NAV = [
  { href: "/#menu", label: "Menu" },
  { href: "/#deals", label: "Deals" },
  { href: "/#visit", label: "Location" },
  { href: "/order", label: "Checkout" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lines = useCart((s) => s.lines);
  const setDrawerOpen = useCart((s) => s.setDrawerOpen);
  const mounted = useHasMounted();
  const count = mounted ? itemCount(lines) : 0;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
        <Link to="/" className="flex min-h-11 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-fg">
            <LogoMark />
          </span>
          <span className="leading-none">
            <span className="font-display text-xl tracking-wide sm:text-2xl">
              {RESTAURANT.name}
            </span>
            <span className="hidden text-[11px] tracking-[0.16em] text-muted uppercase sm:block">
              {RESTAURANT.city}
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {NAV.map((item) =>
            item.href === "/order" ? (
              <Link key={item.href} to="/order" className="transition-colors hover:text-fg">
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="transition-colors hover:text-fg">
                {item.label}
              </a>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          {pathname !== "/order" && (
            <Link
              to="/order"
              className="hidden h-11 items-center rounded-lg bg-fg px-4 text-sm font-semibold text-bg transition-transform duration-150 active:scale-[0.96] sm:inline-flex"
            >
              Order now
            </Link>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-fg transition-transform duration-150 active:scale-[0.96]"
            aria-label="Open cart"
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary-fg px-1.5 text-[11px] font-bold tabular-nums text-primary">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-lg ring-1 ring-border md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-bg/70"
            aria-label="Close menu overlay"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="mobile-nav"
            className="relative z-50 border-t border-border bg-bg px-4 py-3"
          >
            {NAV.map((item) =>
              item.href === "/order" ? (
                <Link
                  key={item.href}
                  to="/order"
                  className="flex h-12 items-center text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex h-12 items-center text-sm font-medium"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
