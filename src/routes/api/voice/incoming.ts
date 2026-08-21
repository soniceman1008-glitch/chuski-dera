import { createFileRoute } from "@tanstack/react-router";
import { greeting, startCall } from "@/lib/server/voice-agent";
import { publicBase, twimlSayGather } from "@/lib/server/voice-twiml";

async function handle(request: Request) {
  const form = await request.formData().catch(() => new FormData());
  const callSid = String(form.get("CallSid") || crypto.randomUUID());
  const from = String(form.get("From") || "");
  const to = String(form.get("To") || "");
  try {
    await startCall(callSid, from, to);
  } catch (err) {
    console.error("[voice] start", err);
  }
  const gather = `${publicBase()}/api/voice/gather`;
  return twimlSayGather(greeting("ur"), "ur", gather);
}

export const Route = createFileRoute("/api/voice/incoming")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
