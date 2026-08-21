import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getDashboard } from "@/lib/server/orders";
import { formatRs } from "@/lib/menu";
import { StatusBadge } from "@/components/admin/status-badge";
import type { OrderRow, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/admin/")({ component: Overview });

const STATUSES: OrderStatus[] = ["new", "pending", "confirmed", "preparing", "delivered", "cancelled"];

function Overview() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getDashboard>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const next = await getDashboard();
        if (!cancelled) setData(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      }
    }
    void tick();
    const id = window.setInterval(tick, 12000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (error) return <p className="text-sm text-primary">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Loading dashboard…</p>;

  const cards = [
    { label: "Total orders", value: String(data.totalOrders) },
    { label: "Today’s orders", value: String(data.todayOrders) },
    { label: "Total sales", value: formatRs(data.totalSales) },
    { label: "Today’s sales", value: formatRs(data.todaySales) },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">Overview</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
            <p className="text-xs tracking-[0.14em] text-muted uppercase">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-lg font-semibold">Quick statistics</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-lg bg-surface px-3 py-3 text-center shadow-[var(--shadow-card)]">
            <p className="text-[11px] tracking-[0.12em] text-muted uppercase">{s}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{data.byStatus[s] ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent orders</h2>
        <Link to="/admin/orders" className="text-sm text-primary">
          All orders
        </Link>
      </div>
      <OrderTable rows={data.recent} />
    </div>
  );
}

export function OrderTable({ rows }: { rows: OrderRow[] }) {
  if (!rows.length) return <p className="mt-4 text-sm text-muted">No orders yet.</p>;
  return (
    <div className="mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs tracking-[0.12em] text-muted uppercase">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3">{row.id}</td>
              <td className="px-4 py-3">
                {row.customer.name}
                <span className="block text-xs text-muted">{row.customer.phone}</span>
              </td>
              <td className="px-4 py-3">{formatRs(row.total)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
