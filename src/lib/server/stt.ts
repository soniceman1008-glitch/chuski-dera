function runtimeEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = proc?.env?.[name];
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}

/** Groq keys are gsk_... — ignore pasted curl/newlines. Never return the raw env blob. */
function groqKey(): string | undefined {
  const raw = runtimeEnv("GROQ_API_KEY");
  if (!raw) return undefined;
  const match = raw.match(/gsk_[A-Za-z0-9]+/);
  return match?.[0];
}

export function groqKeyPresent() {
  return Boolean(groqKey());
}

function fileName(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type.includes("mp4") || type.includes("m4a") || name.endsWith(".m4a") || name.endsWith(".mp4"))
    return "speech.m4a";
  if (type.includes("mpeg") || type.includes("mp3") || name.endsWith(".mp3")) return "speech.mp3";
  if (type.includes("wav") || name.endsWith(".wav")) return "speech.wav";
  if (type.includes("ogg") || name.endsWith(".ogg")) return "speech.ogg";
  return "speech.webm";
}

const MSG_MISSING = "Voice abhi available nahi. Owner ko Groq key update karni hogi.";
const MSG_INVALID = "Voice service configure nahi. Owner Vercel mein GROQ_API_KEY update karein.";
const MSG_BUSY = "Voice busy hai. Thori dair baad try karo.";
const MSG_DOWN = "Voice service temporarily down. Thori dair baad try karo.";
const MSG_FAIL = "Awaaz samajh nahi aayi. Mic ke qareeb 2-3 second dheere bolo.";

function logStt(event: string, extra?: Record<string, string | number | boolean>) {
  console.error("[stt]", event, extra ?? {});
}

export async function transcribeAudio(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const key = groqKey();
  if (!key) {
    logStt("key_missing");
    return { ok: false, status: 503, error: MSG_MISSING };
  }

  const body = new FormData();
  body.append("file", file, fileName(file));
  body.append("model", "whisper-large-v3");
  body.append("response_format", "json");
  body.append("temperature", "0");

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    logStt("fetch_failed", { name });
    return { ok: false, status: 503, error: MSG_DOWN };
  }

  if (res.status === 401 || res.status === 403) {
    logStt("credentials_rejected", { status: res.status });
    return { ok: false, status: 503, error: MSG_INVALID };
  }
  if (res.status === 429) {
    logStt("rate_limited", { status: 429 });
    return { ok: false, status: 429, error: MSG_BUSY };
  }
  if (res.status >= 500) {
    logStt("upstream", { status: res.status });
    return { ok: false, status: 503, error: MSG_DOWN };
  }
  if (!res.ok) {
    logStt("client_error", { status: res.status });
    return { ok: false, status: 502, error: MSG_FAIL };
  }

  try {
    const data = (await res.json()) as { text?: string };
    const text = String(data.text ?? "").trim();
    if (!text) {
      logStt("empty_transcript");
      return { ok: false, status: 422, error: MSG_FAIL };
    }
    logStt("ok", { chars: text.length });
    return { ok: true, text };
  } catch {
    logStt("bad_json");
    return { ok: false, status: 502, error: MSG_FAIL };
  }
}
