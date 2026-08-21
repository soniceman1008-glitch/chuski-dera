import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

async function handle(request: Request) {
  const form = await request.formData().catch(() => new FormData());
  const callSid = String(form.get("CallSid") || "");
  const callStatus = String(form.get("CallStatus") || "");
  const duration = Number(form.get("CallDuration") || 0);
  if (callSid) {
    try {
      const sql = await getSql();
      const ended = ["completed", "busy", "failed", "no-answer", "canceled"].includes(callStatus);
      if (ended) {
        await sql`
          update call_sessions
          set status = case when status = 'in_progress' then ${callStatus} else status end,
              ended_at = now(),
              duration_sec = ${Number.isFinite(duration) ? duration : 0}
          where id = ${callSid}
        `;
      }
    } catch (err) {
      console.error("[voice] status", err);
    }
  }
  return new Response("ok");
}

export const Route = createFileRoute("/api/voice/status")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
