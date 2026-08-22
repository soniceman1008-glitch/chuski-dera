import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listOrders, updateOrderStatus } from "@/lib/server/orders";
import { formatRs } from "@/lib/menu";
import { notifyOrdersChanged } from "@/lib/catalog-sync";
import type { OrderRow, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/kitchen")({ component: KitchenBoard });

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "preparing",
  pending: "preparing",
  confirmed: "preparing",
  preparing: "delivered",
};

function KitchenBoard() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const all = await listOrders({ data: { status: "all" } });
    setRows(all.filter((row) => row.status !== "cancelled" && row.status !== "delivered"));
  }

  useEffect(() => {
    void load().catch((e: Error) => setError(e.message));
    const id = window.setInterval(() => void load().catch(() => {}), 8000);
    return () => window.clearInterval(id);
  }, []);

  async function advance(row: OrderRow) {
    const next = NEXT[row.status];
    if (!next) return;
    setError("");
    try {
      await updateOrderStatus({ data: { id: row.id, status: next } });
      notifyOrdersChanged();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">Kitchen</h1>
      <p className="mt-2 text-sm text-muted">pending → preparing → delivered</p>
      {error ? <p className="mt-3 text-sm text-primary">{error}</p> : null}
      {!rows.length ? <p className="mt-6 text-sm text-muted">No open kitchen tickets.</p> : null}
      <div className="mt-6 grid gap-3">
        {rows.map((order) => {
          const next = NEXT[order.status];
          return (
            <article key={order.id} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold tabular-nums">#{order.id}</p>
                <span className="rounded-full bg-elevated px-3 py-1 text-xs font-semibold tracking-wide">
                  {order.status}
                </span>
              </div>
              <ul className="mt-2 text-sm">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.qty}× {item.name}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm">
                {order.customer.name} · {order.customer.phone}
              </p>
              {order.customer.address ? <p className="text-sm text-muted">{order.customer.address}</p> : null}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-lg font-semibold tabular-nums">{formatRs(order.total)}</p>
                {next ? (
                  <button
                    type="button"
                    onClick={() => void advance(order)}
                    className="h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-fg"
                  >
                    Mark {next}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
