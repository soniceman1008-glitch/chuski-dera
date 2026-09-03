import { Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2, X } from "lucide-react";
import { formatRs } from "@/lib/menu";
import { cartTotal, itemCount, resolveCartItem, useCart } from "@/lib/cart-store";
import { QtyStepper } from "@/components/qty-stepper";
import { useHasMounted } from "@/lib/use-has-mounted";
import { usePublicMenu } from "@/lib/catalog-store";

export function CartDrawer() {
  const mounted = useHasMounted();
  const catalog = usePublicMenu();
  const open = useCart((s) => s.drawerOpen);
  const setOpen = useCart((s) => s.setDrawerOpen);
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const visible = mounted ? lines : [];
  const count = itemCount(visible);
  const total = cartTotal(visible, catalog);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="Close cart"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface shadow-[var(--shadow-card)]">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <h2 className="font-display text-2xl tracking-wide">Your cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-11 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg"
            aria-label="Close cart"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-muted">
              Cart is empty. Add a burger or shawarma from the menu.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((line) => {
                const item = resolveCartItem(line.id, catalog);
                if (!item) return null;
                return (
                  <li key={line.id} className="flex gap-3 py-4">
                    <img
                      src={item.image}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      decoding="async"
                      className="size-16 shrink-0 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-sm tabular-nums text-primary">
                          {formatRs(item.price * line.qty)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <QtyStepper
                          qty={line.qty}
                          label={item.name}
                          onDec={() => setQty(line.id, line.qty - 1)}
                          onInc={() => add(line.id)}
                        />
                        <button
                          type="button"
                          onClick={() => remove(line.id)}
                          className="grid size-11 place-items-center rounded-md text-muted hover:bg-elevated hover:text-fg"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {count} {count === 1 ? "item" : "items"}
            </span>
            <span className="text-lg font-semibold tabular-nums">{formatRs(total)}</span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/order"
              onClick={() => setOpen(false)}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]"
            >
              Checkout
            </Link>
            {visible.length > 0 && (
              <button
                type="button"
                onClick={() => clear()}
                className="inline-flex h-11 items-center justify-center rounded-md text-sm text-muted hover:bg-elevated hover:text-fg"
              >
                Clear cart
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
