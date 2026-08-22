import { nlpClean } from "./nlp";

export type VoiceLang = "en" | "ur" | "ru" | "pa" | "hi";

function norm(s: string) {
  return nlpClean(s);
}

/** Chat agent stays in Urdu. Input may be English/Roman; replies are Urdu. */
export function detectVoiceLang(_text?: string, _fallback: VoiceLang = "ur"): VoiceLang {
  return "ur";
}

export function isVoiceUnclear(text: string): boolean {
  const n = norm(text);
  if (!n || n === "voice") return true;
  return n.replace(/\d+/g, "").trim().length < 2;
}

export function clarifyLanguage(_lang?: VoiceLang): string {
  return "آواز صاف نہیں آئی۔ اردو میں آہستہ، مائیک کے قریب دو تین سیکنڈ بولیں۔";
}

export function agentLangFromVoice(_lang?: VoiceLang): VoiceLang {
  return "ur";
}
