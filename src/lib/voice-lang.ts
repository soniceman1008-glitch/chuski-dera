import { nlpClean } from "./nlp";

export type VoiceLang = "en" | "ur" | "ru" | "pa" | "hi";

function norm(s: string) {
  return nlpClean(s);
}

function score(n: string, re: RegExp) {
  const m = n.match(new RegExp(re.source, "gi"));
  return m ? m.length : 0;
}

const PA_WORDS =
  /\b(tusi|tuhada|tuhadi|tuhade|chahida|chahidi|chahide|kiven|ki haal|menu vich|fer|veere|dass|daso|kithe|punjabi|ki karna|ki lena|sahi ae|theek ae|dassyo|sunao ji|chahunde|vich|hor kuj)\b/;

const HI_WORDS =
  /\b(namaste|namaskar|dhanyavad|hindi|kripya|kripaya|bhaiya|didi|kitna rupaye|kya milega|swagat)\b/;

const RU_WORDS =
  /\b(chahiye|kitna|kitne|keemat|mujhe|mera|meri|lena|bolo|sunao|naam|assalam|walaikum|khush amdeed|bataiye|dobara|theek|shukriya|order karo|kya hai|menu mein|haan|nahi|ka hai|ke hai|kia hai|do na|ek|aur|bhai|yaar|acha|theek hai)\b/;

const EN_WORDS =
  /\b(the|please|would|hello|could|how much|how many|thank you|delivery|address|i want|is it|what is|available|sorry|want to|can i|could you)\b/;

const AMBIG =
  /^(haan|han|ji|yes|no|nahi|nahin|ok|okay|theek|confirm|5|10|five|ten|small|large|bada|chota|ji haan|haan ji)$/;

/**
 * Detect language from THIS message.
 * Short/ambiguous replies keep the previous customer language.
 */
export function detectVoiceLang(text: string, fallback: VoiceLang = "ru"): VoiceLang {
  const raw = (text ?? "").trim();
  if (!raw) return fallback;

  if (/\p{Script=Gurmukhi}/u.test(raw)) return "pa";
  if (/\p{Script=Devanagari}/u.test(raw)) return "hi";
  if (/\p{Script=Arabic}/u.test(raw)) return "ur";

  const n = norm(raw);
  if (!n) return fallback;
  if (AMBIG.test(n) || n.replace(/\d+/g, "").trim().length < 2) return fallback;

  const pa = score(n, PA_WORDS);
  const hi = score(n, HI_WORDS);
  const ru = score(n, RU_WORDS);
  const en = score(n, EN_WORDS);

  if (en > 0 && en >= ru && en >= hi && en >= pa) return "en";
  if (pa > 0 && pa >= ru && pa >= hi) return "pa";
  if (hi > 0 && hi > ru && hi > en) return "hi";
  if (ru > 0) return "ru";

  return fallback;
}

export function isVoiceUnclear(text: string): boolean {
  const n = norm(text);
  if (!n || n === "voice") return true;
  return n.replace(/\d+/g, "").trim().length < 2;
}

export function clarifyLanguage(lang: VoiceLang = "ru"): string {
  if (lang === "hi") return "आवाज़ साफ़ नहीं आई। कृपया फिर से बोलें।";
  if (lang === "pa") return "Awaaz saaf nahi aayi. Dobara dasso.";
  if (lang === "ur") return "آواز صاف نہیں آئی۔ آہستہ دوبارہ بولیں۔";
  if (lang === "en") return "I didn't catch that clearly. Please say it again.";
  return "Awaaz saaf nahi aayi. Dobara boliye.";
}

export function agentLangFromVoice(lang: VoiceLang): VoiceLang {
  return lang;
}
