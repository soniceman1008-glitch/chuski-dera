import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { databaseConfigured, getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { seedIfEmpty } from "./seed";

async function requireAdmin() {
  const { assertAdmin } = await import("./admin-session");
  await assertAdmin();
}

export async function requireStaff(userId: string) {
  if (!databaseConfigured) return "owner";
  const sql = await getSql();
  await seedIfEmpty(sql);
  const mine = await sql<{ role: string }>`select role from staff where user_id = ${userId}`;
  if (mine[0]) return mine[0].role;
  const count = await sql<{ n: number }>`select count(*)::int as n from staff`;
  if (Number(count[0]?.n) === 0) {
    await sql`insert into staff (user_id, role) values (${userId}, ${"owner"})`;
    return "owner";
  }
  return null;
}

export const ensureStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin();
    const role = await requireStaff(context.userId);
    if (!role) return { ok: false as const, role: null };
    return { ok: true as const, role };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin();
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    return sql<{ userId: string; role: string; email: string | null; name: string | null }>`
      select s.user_id as "userId", s.role,
        u.email as email, u.name as name
      from staff s
      left join "user" u on u.id = s.user_id
      order by s.created_at
    `;
  });

export const addStaffByEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin();
    const role = await requireStaff(context.userId);
    if (role !== "owner") throw new Error("Only the owner can add staff");
    const sql = await getSql();
    const users = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${data.email.trim().toLowerCase()} limit 1
    `;
    if (!users[0]) throw new Error("No account with that email yet. They must sign in once first.");
    await sql`
      insert into staff (user_id, role) values (${users[0].id}, ${"admin"})
      on conflict (user_id) do nothing
    `;
    return { ok: true };
  });
