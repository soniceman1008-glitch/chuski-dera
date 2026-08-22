import { createFileRoute } from "@tanstack/react-router";
import { synthesizeAgentSpeech } from "../../../scripts/agent-tts.mjs";

async function handle(request: Request) {
  let body: { text?: string; lang?: string } = {};
  try {
    body = (await request.json()) as { text?: string; lang?: string };
  } catch {
    body = {};
  }
  try {
    const buf = await synthesizeAgentSpeech(body.text ?? "", body.lang ?? "ur");
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("TTS failed", { status: 500 });
  }
}

export const Route = createFileRoute("/api/agent-tts")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
