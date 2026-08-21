export type VoiceLang = "en" | "ur" | "ru" | "pa";

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PA_WORDS =
  /\b(tusi|tuhada|tuhadi|tuhade|chahida|chahidi|chahide|kiven|ki haal|kihal|menu vich|fer|veere|yaar ji|dass|daso|kithe|punjabi|ki karna|ki lena|sahi ae|theek ae)\b/;

const RU_WORDS =
  /\b(kya|hai|hain|chahiye|kitna|kitne|aap|acha|haan|han|shukriya|theek|mujhe|mera|meri|lena|bolo|sunao)\b/;

export function detectVoiceLang(text: string, fallback: VoiceLang = "ru"): VoiceLang {
  if (/\p{Script=Gurmukhi}/u.test(text)) return "pa";
  if (/\p{Script=Arabic}/u.test(text)) return "ur";
  const n = norm(text);
  if (PA_WORDS.test(n)) return "pa";
  if (RU_WORDS.test(n)) return "ru";
  if (/\b(the|please|want|would|hello|menu|order|price|how many)\b/.test(n)) return "en";
  return fallback;
}

export function isVoiceUnclear(text: string): boolean {
  const n = norm(text);
  if (!n || n === "voice") return true;
  return n.replace(/\d+/g, "").trim().length < 2;
}

export function clarifyLanguage(lang: VoiceLang): string {
  if (lang === "ur") {
    return "آواز صاف نہیں آئی۔ براہِ کرم اردو، انگریزی یا پنجابی میں دوبارہ بولیں۔";
  }
  if (lang === "pa") {
    return "Awaaz saaf nahi aayi. Fer ton Urdu, English ya Punjabi vich dasso.";
  }
  if (lang === "en") {
    return "I didn't catch that clearly. Please speak again in Urdu, English, or Punjabi.";
  }
  return "Awaaz saaf nahi aayi. Please Urdu, English ya Punjabi mein dobara bolein.";
}

export function agentLangFromVoice(lang: VoiceLang): "en" | "ur" | "ru" {
  return lang === "pa" ? "ru" : lang;
}
