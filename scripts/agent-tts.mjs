import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * @param {string} text
 * @param {string} [lang]
 * @returns {Promise<Buffer>}
 */
export async function synthesizeAgentSpeech(text, lang = "en") {
  const clean = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
  if (!clean) throw new Error("empty");
  const voice =
    lang === "ur" ? "ur-IN-GulNeural" : lang === "ru" ? "en-IN-NeerjaNeural" : "en-GB-SoniaNeural";
  const out = join(tmpdir(), `chuski-tts-${randomBytes(6).toString("hex")}.mp3`);
  const py = `
import asyncio, sys
from edge_tts import Communicate
text, voice, path = sys.argv[1], sys.argv[2], sys.argv[3]
async def main():
    c = Communicate(text=text, voice=voice, rate="-14%", pitch="-1Hz")
    await c.save(path)
asyncio.run(main())
`;
  await new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", py, clean, voice, out], {
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
