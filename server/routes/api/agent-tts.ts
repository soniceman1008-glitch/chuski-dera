import { defineEventHandler, readBody, setHeader, createError } from "h3";
import { synthesizeAgentSpeech } from "../../../scripts/agent-tts.mjs";

export default defineEventHandler(async (event) => {
  if (event.method !== "POST") {
    throw createError({ statusCode: 405, statusMessage: "Method Not Allowed" });
  }
  const body = (await readBody(event)) as { text?: string; lang?: string };
  try {
    const buf = await synthesizeAgentSpeech(body?.text ?? "", body?.lang ?? "en");
    setHeader(event, "Content-Type", "audio/mpeg");
    setHeader(event, "Cache-Control", "no-store");
    return buf;
  } catch {
    throw createError({ statusCode: 500, statusMessage: "TTS failed" });
  }
});
