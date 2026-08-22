import { createFileRoute } from "@tanstack/react-router";
import { transcribeAudio } from "@/lib/server/stt";
import { clientIpFromHeaders, rateLimit } from "@/lib/server/rate-limit";

const MAX_BYTES = 8 * 1024 * 1024;

async function handle(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit(`transcribe:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Bohot requests. Thori dair baad try karo." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Audio form chahiye." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 200) {
    return Response.json({ error: "Awaaz record nahi hui." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Audio file bohot bari hai." }, { status: 413 });
  }
  try {
    const result = await transcribeAudio(file);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ text: result.text });
  } catch {
    return Response.json({ error: "Transcription fail ho gayi." }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
