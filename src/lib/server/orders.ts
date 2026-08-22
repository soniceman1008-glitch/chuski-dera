import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { seedIfEmpty } from "./seed";
import { requireStaff } from "./staff";
import type { CustomerRow, OrderRow, OrderStatus } from "@/lib/types";

async function requireAdmin() {
  const { assertAdmin } = await import("./admin-session");
  await assertAdmin();
}

const STATUSES: OrderStatus[] = ["new", "pending", "confirmed", "preparing", "delivered", "cancelled"];

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v);
}

async function loadOrder(sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>, id: number): Promise<OrderRow | null> {
  const rows = await sql<Record<string, unknown>>`
    select o.id, o.status, o.subtotal, o.delivery, o.total, o.notes, o.created_at,
      c.id as customer_id, c.name, c.phone, c.address
    from orders o
    join customers c on c.id = o.customer_id
    where o.id = ${id}
  `;
  const row = rows[0];
  if (!row) return null;
  const items = await sql<Record<string, unknown>>`
    select id, item_id, name, price, qty from order_items where order_id = ${id} order by id
  `;
  return {
    id: num(row.id),
    status: String(row.status) as OrderStatus,
    subtotal: num(row.subtotal),
    delivery: num(row.delivery),
    total: num(row.total),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at),
    customer: {
      id: num(row.customer_id),
      name: String(row.name),
      phone: String(row.phone),
      address: String(row.address ?? ""),
    },
    items: items.map((it) => ({
      id: num(it.id),
      itemId: String(it.item_id),
      name: String(it.name),
      price: num(it.price),
      qty: num(it.qty),
    })),
  };
}

export const placeOrder = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        phone: z.string().min(6).max(30),
        address: z.string().min(1).max(200),
        lines: z.array(z.object({ id: z.string().min(1), qty: z.number().int().min(1).max(99) })).min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const name = data.name.trim();
    const phone = data.phone.trim();
    const address = data.address.trim();
    const priced: { id: string; name: string; price: number; qty: number }[] = [];
    for (const line of data.lines) {
      const rows = await sql<{ id: string; name: string; price: number; available: boolean }>`
        select id, name, price, available from menu_items where id = ${line.id}
      `;
      const item = rows[0];
      if (!item || !item.available) throw new Error(`${line.id} is not available`);
      priced.push({ id: item.id, name: item.name, price: num(item.price), qty: line.qty });
    }
    const subtotal = priced.reduce((sum, l) => sum + l.price * l.qty, 0);
    const existing = await sql<{ id: number }>`select id from customers where phone = ${phone} limit 1`;
    let customerId = existing[0] ? num(existing[0].id) : 0;
    if (!customerId) {
      const inserted = await sql<{ id: number }>`
        insert into customers (name, phone, address) values (${name}, ${phone}, ${address})
        returning id
      `;
      customerId = num(inserted[0].id);
    } else {
      await sql`update customers set name = ${name}, address = ${address} where id = ${customerId}`;
    }
    const order = await sql<{ id: number }>`
      insert into orders (customer_id, status, subtotal, delivery, total)
      values (${customerId}, ${"new"}, ${subtotal}, ${0}, ${subtotal})
      returning id
    `;
    const orderId = num(order[0].id);
    for (const line of priced) {
      await sql`
        insert into order_items (order_id, item_id, name, price, qty)
        values (${orderId}, ${line.id}, ${line.name}, ${line.price}, ${line.qty})
      `;
    }
    return { id: orderId, total: subtotal };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    await seedIfEmpty(sql);
    const totals = await sql<{ orders: number; sales: number; today: number; today_sales: number }>`
      select
        count(*)::int as orders,
        coalesce(sum(total) filter (where status <> 'cancelled'), 0)::int as sales,
        count(*) filter (where created_at >= date_trunc('day', now()))::int as today,
        coalesce(sum(total) filter (
          where status <> 'cancelled' and created_at >= date_trunc('day', now())
        ), 0)::int as today_sales
      from orders
    `;
    const byStatus = await sql<{ status: string; n: number }>`
      select status, count(*)::int as n from orders group by status
    `;
    const recentIds = await sql<{ id: number }>`select id from orders order by created_at desc limit 8`;
    const recent: OrderRow[] = [];
    for (const row of recentIds) {
      const order = await loadOrder(sql, num(row.id));
      if (order) recent.push(order);
    }
    const t = totals[0];
    return {
      totalOrders: num(t?.orders),
      todayOrders: num(t?.today),
      totalSales: num(t?.sales),
      todaySales: num(t?.today_sales),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, num(s.n)])) as Record<string, number>,
      recent,
    };
  });

export const listOrders = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ status: z.enum(["all", ...STATUSES]).optional().default("all") }).parse(d ?? { status: "all" }),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const ids =
      data.status === "all"
        ? await sql<{ id: number }>`select id from orders order by created_at desc limit 80`
        : await sql<{ id: number }>`select id from orders where status = ${data.status} order by created_at desc limit 80`;
    const orders: OrderRow[] = [];
    for (const row of ids) {
      const order = await loadOrder(sql, num(row.id));
      if (order) orders.push(order);
    }
    return orders;
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) =>
    z.object({ id: z.number().int(), status: z.enum(STATUSES as [OrderStatus, ...OrderStatus[]]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`update orders set status = ${data.status} where id = ${data.id}`;
    return { ok: true };
  });

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ q: z.string().optional().default("") }).parse(d ?? { q: "" }))
  .handler(async ({ context, data }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const q = `%${(data.q ?? "").trim().toLowerCase()}%`;
    const hasQ = Boolean((data.q ?? "").trim());
    const rows = hasQ
      ? await sql<Record<string, unknown>>`
          select c.id, c.name, c.phone, c.address, c.created_at,
            count(o.id)::int as order_count,
            coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::int as spent
          from customers c left join orders o on o.customer_id = c.id
          where lower(c.name) like ${q} or c.phone like ${q}
          group by c.id order by c.created_at desc limit 80`
      : await sql<Record<string, unknown>>`
          select c.id, c.name, c.phone, c.address, c.created_at,
            count(o.id)::int as order_count,
            coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::int as spent
          from customers c left join orders o on o.customer_id = c.id
          group by c.id order by c.created_at desc limit 80`;
    return rows.map((r): CustomerRow => ({
      id: num(r.id),
      name: String(r.name),
      phone: String(r.phone),
      address: String(r.address ?? ""),
      createdAt: String(r.created_at),
      orderCount: num(r.order_count),
      spent: num(r.spent),
    }));
  });

export const customerOrders = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const ids = await sql<{ id: number }>`select id from orders where customer_id = ${data.id} order by created_at desc`;
    const orders: OrderRow[] = [];
    for (const row of ids) {
      const order = await loadOrder(sql, num(row.id));
      if (order) orders.push(order);
    }
    return orders;
  });

export const newOrderCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const rows = await sql<{ n: number; max_id: number }>`
      select count(*)::int as n, coalesce(max(id),0)::int as max_id from orders where status = ${"new"}`;
    return { n: num(rows[0]?.n), maxId: num(rows[0]?.max_id) };
  });
