import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { customerOrders, listCustomers } from "@/lib/server/orders";
import { formatRs } from "@/lib/menu";
import type { CustomerRow, OrderRow } from "@/lib/types";

export const Route = createFileRoute("/admin/customers")({ component: CustomersAdmin });

function CustomersAdmin() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [history, setHistory] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");

  async function load(query = q) {
    setRows(await listCustomers({ data: { q: query } }));
  }

  useEffect(() => {
    void load().catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-wide">Customers</h1>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load().catch((err: Error) => setError(err.message));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone"
          className="h-11 flex-1 rounded-md bg-surface px-3 text-sm ring-1 ring-border"
        />
        <button type="submit" className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg">
          Search
        </button>
      </form>
      <div className="mt-5 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs tracking-[0.12em] text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Spent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-primary"
                    onClick={() => {
                      void customerOrders({ data: { id: row.id } })
                        .then(setHistory)
                        .catch((err: Error) => setError(err.message));
                    }}
                  >
                    {row.name}
                  </button>
                  <span className="block text-xs text-muted">{row.address}</span>
                </td>
                <td className="px-4 py-3">{row.phone}</td>
                <td className="px-4 py-3">{row.orderCount}</td>
                <td className="px-4 py-3">{formatRs(row.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {history && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 px-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Order history</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setHistory(null)}>
                Close
              </button>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {history.length === 0 && <li className="text-muted">No orders.</li>}
              {history.map((o) => (
                <li key={o.id}>
                  #{o.id} · {o.status} · {formatRs(o.total)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
