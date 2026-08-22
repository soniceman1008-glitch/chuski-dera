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

type Target = { url: string; key: string; model: string };

function whisperTargets(): Target[] {
  const out: Target[] = [];
  const groq = runtimeEnv("GROQ_API_KEY");
  if (groq) {
    out.push({
      url: "https://api.groq.com/openai/v1/audio/transcriptions",
      key: groq,
      model: "whisper-large-v3",
    });
  }
  const openai = runtimeEnv("OPENAI_API_KEY");
  if (openai) {
    out.push({
      url: "https://api.openai.com/v1/audio/transcriptions",
      key: openai,
      model: "whisper-1",
    });
  }
  return out;
}

export async function transcribeAudio(
  file: File,
): Promise<{ ok: true; text: string } | { ok: false; error: string; status: number }> {
  const targets = whisperTargets();
  if (!targets.length) {
    return {
      ok: false,
      status: 503,
      error: "Voice key missing. Vercel mein GROQ_API_KEY add karein.",
    };
  }

  let last = "Whisper ne awaaz convert nahi ki.";
  for (const target of targets) {
    const body = new FormData();
    body.append("file", file, file.name || "speech.webm");
    body.append("model", target.model);
    body.append("language", "ur");
    body.append("response_format", "json");
    body.append("temperature", "0");

    const res = await fetch(target.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${target.key}` },
      body,
    });

    let data: { text?: string; error?: { message?: string } } = {};
    try {
      data = (await res.json()) as { text?: string; error?: { message?: string } };
    } catch {
      data = {};
    }

    if (res.ok) return { ok: true, text: String(data.text ?? "").trim() };
    last = data.error?.message || last;
  }

  const invalid = /invalid api key|incorrect api key|unauthorized/i.test(last);
  return {
    ok: false,
    status: 502,
    error: invalid
      ? "GROQ_API_KEY ghalat hai. Groq pe nayi key banao, Vercel mein purani delete karke nayi paste karo, phir Redeploy."
      : last,
  };
}
