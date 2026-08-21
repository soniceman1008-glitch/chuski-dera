import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireStaff } from "./staff";
import { voiceAgentStatus } from "./voice-agent";

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v);
}

export const getVoiceDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const status = voiceAgentStatus();
    const calls = await sql<Record<string, unknown>>`
      select id, from_number, to_number, lang, step, status, customer_name, customer_phone,
        address, notes, cart_json, order_id, started_at, ended_at, duration_sec, last_speech
      from call_sessions order by started_at desc limit 40
    `;
    const ids = calls.map((c) => String(c.id));
    const turns =
      ids.length === 0
        ? []
        : await sql.query<Record<string, unknown>>(
            `select call_id, role, text, created_at from call_turns where call_id = any($1::text[]) order by id`,
            [ids],
          );
    const byCall = new Map<string, { role: string; text: string; at: string }[]>();
    for (const t of turns) {
      const id = String(t.call_id);
      const list = byCall.get(id) ?? [];
      list.push({ role: String(t.role), text: String(t.text), at: String(t.created_at) });
      byCall.set(id, list);
    }
    return {
      status,
      calls: calls.map((c) => ({
        id: String(c.id),
        fromNumber: String(c.from_number ?? ""),
        toNumber: String(c.to_number ?? ""),
        lang: String(c.lang),
        step: String(c.step),
        status: String(c.status),
        name: String(c.customer_name ?? ""),
        phone: String(c.customer_phone ?? ""),
        address: String(c.address ?? ""),
        notes: String(c.notes ?? ""),
        cart: String(c.cart_json ?? "[]"),
        orderId: c.order_id == null ? null : num(c.order_id),
        startedAt: String(c.started_at),
        endedAt: c.ended_at ? String(c.ended_at) : null,
        durationSec: num(c.duration_sec),
        lastSpeech: String(c.last_speech ?? ""),
        turns: byCall.get(String(c.id)) ?? [],
      })),
    };
  });
