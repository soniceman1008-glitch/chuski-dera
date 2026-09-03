import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function voiceFor(lang) {
  const key = String(lang || "ur").toLowerCase();
  if (key === "en") return "en-IN-NeerjaNeural";
  if (key === "hi" || key === "pa") return "hi-IN-SwaraNeural";
  return "ur-PK-UzmaNeural";
}

function elevenReady() {
  return Boolean(process.env.ELEVENLABS_API_KEY) && Boolean(process.env.ELEVENLABS_VOICE_ID);
}

function ttsLanguageCode(lang) {
  const key = String(lang || "ur").toLowerCase();
  if (key === "en") return "en";
  if (key === "hi") return "hi";
  if (key === "pa") return "pa";
  return "ur";
}

const RU_WORDS = [
  [/assalamualaikum/gi, "السلام علیکم"],
  [/khush amdeed/gi, "خوش آمدید"],
  [/namaste/gi, "نمستے"],
  [/chuski dera/gi, "چسکی ڈیرہ"],
  [/zinger burger/gi, "زنگر برگر"],
  [/chicken shawarma/gi, "چکن شاورما"],
  [/whatsapp/gi, "واٹس ایپ"],
  [/delivery/gi, "ڈلیوری"],
  [/address/gi, "پتہ"],
  [/number/gi, "نمبر"],
  [/phone/gi, "فون"],
  [/order/gi, "آرڈر"],
  [/menu/gi, "مینو"],
  [/price|prices|keemat/gi, "قیمت"],
  [/nuggets/gi, "نگٹس"],
  [/shawarma/gi, "شاورما"],
  [/zinger/gi, "زنگر"],
  [/burger/gi, "برگر"],
  [/pieces/gi, "پیس"],
  [/small/gi, "سمال"],
  [/large/gi, "لارج"],
  [/cart/gi, "کارٹ"],
  [/total/gi, "کل"],
  [/cancel/gi, "کینسل"],
  [/confirm/gi, "کنفرم"],
  [/kitchen/gi, "کچن"],
  [/item/gi, "چیز"],
  [/please/gi, "براہ کرم"],
  [/thank you|shukriya/gi, "شکریہ"],
  [/\brs\.?\s*/gi, "روپے "],
  [/\bwant to add it\b/gi, "شامل کروں؟"],
  [/add ho gaya/gi, "شامل ہو گیا"],
  [/khali hai|khali ae/gi, "خالی ہے"],
  [/bataiye|dasso|dijiye/gi, "بتائیں"],
  [/chahenge|chahunde o/gi, "چاہتے ہیں"],
  [/madad kar sakti hoon|help kar sakti hoon|madad kar sakdi aan/gi, "مدد کر سکتی ہوں"],
  [/theek hai|theek ae/gi, "ٹھیک ہے"],
  [/pehle|pehlan/gi, "پہلے"],
  [/aap ka|aapka|tuhada/gi, "آپ کا"],
  [/hamare paas|saade kol/gi, "ہمارے پاس"],
  [/\bmain\b/gi, "میں"],
  [/\baap\b/gi, "آپ"],
  [/\bkya\b/gi, "کیا"],
  [/\bki\b/gi, "کی"],
  [/\bhai\b|\bae\b|\bhain\b/gi, "ہے"],
  [/\bnahi\b/gi, "نہیں"],
  [/\bhaan\b/gi, "ہاں"],
  [/\bnaam\b/gi, "نام"],
  [/\bapna\b/gi, "اپنا"],
  [/\bjhang\b/gi, "جھنگ"],
  [/\bmein\b|\bvich\b/gi, "میں"],
  [/\bse\b|\bton\b/gi, "سے"],
  [/\bko\b|\bnu\b/gi, "کو"],
  [/\bpar\b|\bte\b/gi, "پر"],
  [/\bya\b/gi, "یا"],
  [/\bor\b/gi, "یا"],
  [/\band\b/gi, "اور"],
  [/\bis\b/gi, "ہے"],
  [/\byour\b/gi, "آپ کا"],
  [/\bsay\b/gi, "کہیں"],
  [/\bno\b/gi, "نہیں"],
  [/\byes\b/gi, "ہاں"],
];

function toSpeakable(text, lang) {
  let s = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!s) return s;
  if (/\p{Script=Arabic}/u.test(s) || /\p{Script=Devanagari}/u.test(s) || /\p{Script=Gurmukhi}/u.test(s)) {
    return s.replace(/\bRs\.?\s*/gi, "روپے ");
  }
  const code = ttsLanguageCode(lang);
  if (code === "en") return s;
  for (const [re, to] of RU_WORDS) s = s.replace(re, to);
  return s;
}

async function synthesizeEleven(text, lang) {
  if (!elevenReady()) return null;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const spoken = toSpeakable(text, lang);
  const code = ttsLanguageCode(lang);
  const attempts = [
    { model_id: "eleven_turbo_v2_5", language_code: code },
    { model_id: "eleven_multilingual_v2", language_code: code },
  ];
  for (const extra of attempts) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "",
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: spoken,
        voice_settings: {
          stability: 0.58,
          similarity_boost: 0.72,
          style: 0.04,
          use_speaker_boost: true,
        },
        ...extra,
      }),
    });
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 200) return buf;
  }
  return null;
}

async function synthesizeHouseSpeech(text, lang = "ur") {
  const voice = voiceFor(lang);
  const spoken = toSpeakable(text, lang);
  const out = join(tmpdir(), `chuski-tts-${randomBytes(6).toString("hex")}.mp3`);
  const py = `
import asyncio, sys
from edge_tts import Communicate
text, voice, path = sys.argv[1], sys.argv[2], sys.argv[3]
async def main():
    c = Communicate(text=text, voice=voice, rate="-8%", pitch="-1Hz")
    await c.save(path)
asyncio.run(main())
`;
  await new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", py, spoken, voice, out], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => {
      err += String(d);
    });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("tts timeout"));
    }, 4000);
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

export async function synthesizeAgentSpeech(text, lang = "ur") {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 700);
  if (!clean) throw new Error("empty");
  try {
    const eleven = await synthesizeEleven(clean, lang);
    if (eleven) return eleven;
  } catch {
    /* house voice fallback */
  }
  return synthesizeHouseSpeech(clean, lang);
}
