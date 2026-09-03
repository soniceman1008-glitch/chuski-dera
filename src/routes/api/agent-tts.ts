import { createFileRoute } from "@tanstack/react-router";
import { synthesizeAgentSpeech } from "../../../scripts/agent-tts.mjs";
import { clientIpFromHeaders, rateLimit } from "@/lib/server/rate-limit";

async function handle(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit(`tts:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "tts_unavailable" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  let body: { text?: string; lang?: string } = {};
  try {
    body = (await request.json()) as { text?: string; lang?: string };
  } catch {
    body = {};
  }
  try {
    const buf = await Promise.race([
      synthesizeAgentSpeech(body.text ?? "", body.lang ?? "ur"),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("tts slow")), 4500)),
    ]);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "tts_unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/agent-tts")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
