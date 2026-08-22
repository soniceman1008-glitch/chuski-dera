function runtimeEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = proc?.env?.[name];
  if (value == null) return undefined;
  const trimmed = String(value)
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  return trimmed ? trimmed : undefined;
}

function groqKey(): string | undefined {
  return runtimeEnv("GROQ_API_KEY");
}

function fileName(file: File) {
  const type = (file.type || "").toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "speech.m4a";
  if (type.includes("mpeg") || type.includes("mp3")) return "speech.mp3";
  if (type.includes("wav")) return "speech.wav";
  if (type.includes("ogg")) return "speech.ogg";
  return "speech.webm";
}

const MSG_MISSING = "Voice abhi available nahi. Owner ko Groq key update karni hogi.";
const MSG_INVALID = "Voice service configure nahi. Owner Vercel mein GROQ_API_KEY update karein.";
const MSG_BUSY = "Voice busy hai. Thori dair baad try karo.";
const MSG_DOWN = "Voice service temporarily down. Thori dair baad try karo.";
const MSG_FAIL = "Awaaz samajh nahi aayi. Mic ke qareeb 2-3 second dheere bolo.";

export async function transcribeAudio(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const key = groqKey();
  if (!key) {
    return { ok: false, status: 503, error: MSG_MISSING };
  }

  const body = new FormData();
  body.append("file", file, fileName(file));
  body.append("model", "whisper-large-v3-turbo");
  body.append("response_format", "json");
  body.append("temperature", "0");
  body.append(
    "prompt",
    "Cafe order in Urdu, English, Punjabi or Hindi. Words: zinger burger shawarma fries nuggets wings deal chahiye.",
  );

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    return { ok: false, status: 503, error: MSG_DOWN };
  }

  if (res.status === 401 || res.status === 403) {
    console.error("[stt] Groq credentials rejected", res.status);
    return { ok: false, status: 503, error: MSG_INVALID };
  }
  if (res.status === 429) {
    return { ok: false, status: 429, error: MSG_BUSY };
  }
  if (res.status >= 500) {
    console.error("[stt] Groq upstream", res.status);
    return { ok: false, status: 503, error: MSG_DOWN };
  }
  if (!res.ok) {
    console.error("[stt] Groq client error", res.status);
    return { ok: false, status: 502, error: MSG_FAIL };
  }

  try {
    const data = (await res.json()) as { text?: string };
    const text = String(data.text ?? "").trim();
    if (!text) return { ok: false, status: 422, error: MSG_FAIL };
    return { ok: true, text };
  } catch {
    return { ok: false, status: 502, error: MSG_FAIL };
  }
}
