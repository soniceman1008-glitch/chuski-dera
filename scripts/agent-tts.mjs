import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** One restaurant-friendly female house voice family. */
function voiceFor(lang) {
  const key = String(lang || "ru").toLowerCase();
  if (key === "ur") return "ur-PK-UzmaNeural";
  if (key === "hi") return "hi-IN-SwaraNeural";
  if (key === "pa") return "hi-IN-SwaraNeural";
  if (key === "ru") return "ur-PK-UzmaNeural";
  if (key === "en") return "en-IN-NeerjaNeural";
  return "en-IN-NeerjaNeural";
}

function cloneReady() {
  return (
    process.env.VOICE_CLONE_PERMISSION === "true" &&
    Boolean(process.env.ELEVENLABS_API_KEY) &&
    Boolean(process.env.ELEVENLABS_VOICE_ID)
  );
}

/**
 * Instant clone TTS. Only runs when owner permission + API key + voice id are set.
 * @param {string} text
 * @returns {Promise<Buffer | null>}
 */
async function synthesizeClonedSpeech(text) {
  if (!cloneReady()) return null;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.82,
        style: 0.12,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 200 ? buf : null;
}

/**
 * @param {string} text
 * @param {string} [lang]
 * @returns {Promise<Buffer>}
 */
async function synthesizeHouseSpeech(text, lang = "ru") {
  const voice = voiceFor(lang);
  const out = join(tmpdir(), `chuski-tts-${randomBytes(6).toString("hex")}.mp3`);
  const py = `
import asyncio, sys
from edge_tts import Communicate
text, voice, path = sys.argv[1], sys.argv[2], sys.argv[3]
async def main():
    c = Communicate(text=text, voice=voice, rate="-12%", pitch="-2Hz")
    await c.save(path)
asyncio.run(main())
`;
  await new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", py, text, voice, out], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => {
      err += String(d);
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("tts timeout"));
    }, 20000);
    child.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve(undefined);
      else reject(new Error(err || `tts ${code}`));
    });
  });
  try {
    return await readFile(out);
  } finally {
    await unlink(out).catch(() => {});
  }
}

/**
 * @param {string} text
 * @param {string} [lang]
 * @returns {Promise<Buffer>}
 */
export async function synthesizeAgentSpeech(text, lang = "ru") {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
  if (!clean) throw new Error("empty");

  try {
    const cloned = await synthesizeClonedSpeech(clean);
    if (cloned) return cloned;
  } catch {
    /* house voice fallback */
  }

  return synthesizeHouseSpeech(clean, lang);
}
