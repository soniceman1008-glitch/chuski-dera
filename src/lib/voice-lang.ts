export type VoiceLang = "en" | "ur" | "ru" | "pa" | "hi";

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\u0900-\u097f\u0a00-\u0a7f\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PA_WORDS =
  /\b(tusi|tuhada|tuhadi|tuhade|chahida|chahidi|chahide|kiven|ki haal|kihal|menu vich|fer|veere|yaar ji|dass|daso|kithe|punjabi|ki karna|ki lena|sahi ae|theek ae|o kaka|bhai ji|ki rate|dassyo|sunao ji|ki pata)\b/;

const HI_WORDS =
  /\b(namaste|namaskar|dhanyavad|hindi|kripya|kripaya|bhaiya|didi|kitna rupaye|mujhe chahiye|kya milega|please hindi)\b/;

const RU_WORDS =
  /\b(kya|hai|hain|chahiye|kitna|kitne|aap|acha|haan|han|shukriya|theek|mujhe|mera|meri|lena|bolo|sunao|order|menu|price|keemat|address|naam)\b/;

const EN_WORDS =
  /\b(the|please|want|would|hello|hi|menu|order|price|how many|what|address|delivery|yes|no|thanks|thank you)\b/;

function score(n: string, re: RegExp) {
  const m = n.match(new RegExp(re.source, "gi"));
  return m ? m.length : 0;
}

/** Detect from the latest utterance. Never lock to the first language. */
export function detectVoiceLang(text: string, fallback: VoiceLang = "ru"): VoiceLang {
  const raw = text.trim();
  if (!raw) return fallback;
  if (/\p{Script=Gurmukhi}/u.test(raw)) return "pa";
  if (/\p{Script=Devanagari}/u.test(raw)) return "hi";
  if (/\p{Script=Arabic}/u.test(raw)) return "ur";

  const n = norm(raw);
  const pa = score(n, PA_WORDS);
  const hi = score(n, HI_WORDS);
  const ru = score(n, RU_WORDS);
  const en = score(n, EN_WORDS);

  const best = Math.max(pa, hi, ru, en);
  if (best === 0) return fallback;
  if (pa === best && pa > 0) return "pa";
  if (hi === best && hi > 0) return "hi";
  if (ru === best && ru > 0 && ru >= en) return "ru";
  if (en === best && en > 0) return "en";
  return fallback;
}

export function isVoiceUnclear(text: string): boolean {
  const n = norm(text);
  if (!n || n === "voice") return true;
  return n.replace(/\d+/g, "").trim().length < 2;
}

export function clarifyLanguage(lang: VoiceLang): string {
  if (lang === "ur") {
    return "آواز صاف نہیں آئی۔ براہِ کرم اردو، انگریزی، پنجابی یا ہندی میں دوبارہ بولیں۔";
  }
  if (lang === "hi") {
    return "Awaaz saaf nahi aayi. Hindi, Urdu, English ya Punjabi mein dobara boliye.";
  }
  if (lang === "pa") {
    return "Awaaz saaf nahi aayi. Fer ton Urdu, English, Hindi ya Punjabi vich dasso.";
  }
  if (lang === "en") {
    return "I didn't catch that clearly. Please speak again in Urdu, English, Punjabi, or Hindi.";
  }
  return "Awaaz saaf nahi aayi. Please Urdu, English, Punjabi ya Hindi mein dobara bolein.";
}

export function agentLangFromVoice(lang: VoiceLang): VoiceLang {
  return lang;
}
