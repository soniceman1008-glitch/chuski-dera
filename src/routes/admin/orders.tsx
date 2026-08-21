import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { listOrders, updateOrderStatus } from "@/lib/server/orders";
import { formatRs } from "@/lib/menu";
import { StatusBadge } from "@/components/admin/status-badge";
import { notifyOrdersChanged } from "@/lib/catalog-sync";
import type { OrderRow, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/orders")({ component: OrdersAdmin });

const STATUSES: Array<OrderStatus | "all"> = ["all", "new", "pending", "confirmed", "preparing", "delivered", "cancelled"];

function OrdersAdmin() {
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [open, setOpen] = useState<OrderRow | null>(null);
  const [error, setError] = useState("");

  async function load(next = status) {
    setRows(await listOrders({ data: { status: next } }));
  }

  useEffect(() => {
    void load().catch((e: Error) => setError(e.message));
    const id = window.setInterval(() => void load().catch(() => {}),
      12000);
    return () => window.clearInterval(id);
  }, [status]);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">Orders</h1>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`h-10 rounded-full px-3 text-sm capitalize ${status === s ? "bg-primary text-primary-fg" : "bg-surface ring-1 ring-border"}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted uppercase"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3"><button type="button" className="text-primary" onClick={() => setOpen(row)}>{row.id}</button></td>
                <td className="px-4 py-3">{row.customer.name}<span className="block text-xs text-muted">{row.customer.phone}</span></td>
                <td className="px-4 py-3">{formatRs(row.total)}</td>
                <td className="px-4 py-3">
                  <select value={row.status} className="h-10 rounded-md bg-elevated px-2 text-sm ring-1 ring-border" onChange={(e) => {
                    const next = e.target.value as OrderStatus;
                    void updateOrderStatus({ data: { id: row.id, status: next } }).then(() => { notifyOrdersChanged(); return load(); }).catch((err: Error) => setError(err.message));
                  }}>
                    {STATUSES.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 px-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-5">
            <div className="flex justify-between"><h2 className="text-lg font-semibold">Order #{open.id}</h2><button type="button" onClick={() => setOpen(null)}>Close</button></div>
            <p className="mt-2 text-sm text-muted">{open.customer.name} · {open.customer.phone}</p>
            <p className="text-sm text-muted">{open.customer.address}</p>
            <ul className="mt-4 space-y-1 text-sm">{open.items.map((it) => <li key={it.id}>{it.qty}× {it.name} — {formatRs(it.price * it.qty)}</li>)}</ul>
            <p className="mt-3 font-semibold">{formatRs(open.total)}</p>
            <div className="mt-3"><StatusBadge status={open.status} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
