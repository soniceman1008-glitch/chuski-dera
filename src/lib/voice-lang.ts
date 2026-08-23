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
  /\b(tusi|tuhada|tuhadi|tuhade|chahida|chahidi|chahide|kiven|ki haal|menu vich|fer|veere|dass|daso|kithe|punjabi|ki karna|ki lena|sahi ae|theek ae|dassyo|sunao ji|chahunde|vich)\b/;

const HI_WORDS =
  /\b(namaste|namaskar|dhanyavad|hindi|kripya|kripaya|bhaiya|didi|kitna rupaye|mujhe chahiye|kya milega|swagat|chahiye|kitna|hai|hain)\b/;

const RU_WORDS =
  /\b(chahiye|kitna|kitne|keemat|mujhe|mera|meri|lena|bolo|sunao|naam|assalam|walaikum|khush amdeed|bataiye|dobara|theek|shukriya|order karo|kya hai|menu mein)\b/;

const EN_WORDS =
  /\b(the|a|an|please|want|would|hello|could|how much|how many|thank you|delivery|address|i want|is it|what is|available|sorry|yes|no|order|menu|price)\b/;

/**
 * Detect language from THIS message only.
 * Never lock to session, browser locale, or previous reply language.
 */
export function detectVoiceLang(text: string, _fallback: VoiceLang = "en"): VoiceLang {
  const raw = (text ?? "").trim();
  if (!raw) return "en";

  // Script-based (highest confidence)
  if (/\p{Script=Gurmukhi}/u.test(raw)) return "pa";
  if (/\p{Script=Devanagari}/u.test(raw)) return "hi";
  if (/\p{Script=Arabic}/u.test(raw)) return "ur";

  const n = norm(raw);
  if (!n) return "en";

  const pa = score(n, PA_WORDS);
  const hi = score(n, HI_WORDS);
  const ru = score(n, RU_WORDS);
  const en = score(n, EN_WORDS);

  // Pure English product names / short English phrases
  if (/^[a-z0-9\s.,!?'-]+$/i.test(raw) && en >= ru && en >= hi && en >= pa) {
    // If only food English words and no roman-urdu markers, treat as English
    if (ru === 0 && pa === 0) return "en";
  }

  const best = Math.max(pa, hi, ru, en);
  if (best === 0) {
    // Latin-only short text defaults to English
    if (/^[a-z0-9\s.,!?'-]+$/i.test(raw)) return "en";
    return "en";
  }
  if (pa === best && pa > 0) return "pa";
  if (hi === best && hi > ru && hi > en) return "hi";
  if (ru === best && ru > en) return "ru";
  if (en === best && en > 0) return "en";
  if (ru > 0) return "ru";
  return "en";
}

export function isVoiceUnclear(text: string): boolean {
  const n = norm(text);
  if (!n || n === "voice") return true;
  return n.replace(/\d+/g, "").trim().length < 2;
}

export function clarifyLanguage(lang: VoiceLang = "en"): string {
  if (lang === "hi") return "आवाज़ साफ़ नहीं आई। कृपया फिर से बोलें।";
  if (lang === "pa") return "آواز صاف نہیں آئی۔ دوبارہ دسو۔";
  if (lang === "ur") return "آواز صاف نہیں آئی۔ آہستہ دوبارہ بولیں۔";
  if (lang === "ru") return "Awaaz saaf nahi aayi. Dobara boliye.";
  return "I didn't catch that clearly. Please say it again.";
}

export function agentLangFromVoice(lang: VoiceLang): VoiceLang {
  return lang;
}
