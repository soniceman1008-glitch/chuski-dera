import { createFileRoute } from "@tanstack/react-router";
import { transcribeAudio } from "@/lib/server/stt";
import { clientIpFromHeaders, rateLimit } from "@/lib/server/rate-limit";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPE = /^(audio\/|video\/webm|application\/octet-stream|$)/i;
const ALLOWED_NAME = /\.(webm|ogg|oga|mp3|mp4|m4a|wav|mpeg)$/i;

async function handlePost(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = rateLimit(`transcribe:${ip}`, 8, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Bohot requests. Thori dair baad try karo." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BYTES + 8192) {
    return Response.json({ error: "Audio file too large." }, { status: 413 });
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
    return Response.json({ error: "Audio file too large." }, { status: 413 });
  }
  if (file.type && !ALLOWED_TYPE.test(file.type) && !ALLOWED_NAME.test(file.name || "")) {
    return Response.json({ error: "Audio file invalid hai." }, { status: 400 });
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
      GET: () => Response.json({ ok: true }),
      POST: ({ request }) => handlePost(request),
    },
  },
});
