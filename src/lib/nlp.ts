import type { VoiceLang } from "./voice-lang";

export type NlpIntent =
  | "menu"
  | "add"
  | "remove"
  | "qty"
  | "cart"
  | "confirm"
  | "deny"
  | "hours"
  | "staff"
  | "price"
  | "unclear"
  | "chat";

const SPELL: [RegExp, string][] = [
  [/\bjinger\b/g, "zinger"],
  [/\bzingar\b/g, "zinger"],
  [/\bzingr\b/g, "zinger"],
  [/\bberger\b/g, "burger"],
  [/\bbargar\b/g, "burger"],
  [/\bshwarma\b/g, "shawarma"],
  [/\bshawerma\b/g, "shawarma"],
  [/\bshavarma\b/g, "shawarma"],
  [/\bnugget\b/g, "nuggets"],
  [/\bnagets\b/g, "nuggets"],
  [/\bwinges\b/g, "wings"],
  [/\bmargarita\b/g, "margarita"],
  [/\bmargarette\b/g, "margarita"],
  [/\bchahye\b/g, "chahiye"],
  [/\bcahiye\b/g, "chahiye"],
  [/\bchaheye\b/g, "chahiye"],
  [/\blenay\b/g, "lena"],
  [/\bleney\b/g, "lena"],
  [/\bhaanji\b/g, "haan"],
  [/\bhanji\b/g, "haan"],
  [/\btheek hai\b/g, "theek"],
  [/\bokey\b/g, "ok"],
  [/\bokay\b/g, "ok"],
];

export function nlpClean(text: string): string {
  let s = text
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\u0900-\u097f\u0a00-\u0a7f\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [re, to] of SPELL) s = s.replace(re, to);
  return s;
}

export function nlpTokens(text: string): string[] {
  return nlpClean(text).split(" ").filter((w) => w.length > 0);
}

const INTENT_RULES: { intent: NlpIntent; re: RegExp }[] = [
  { intent: "staff", re: /\b(staff|insaan|human|agent|manager|call karo)\b/ },
  { intent: "confirm", re: /\b(haan|yes|confirm|finalize|send karo|bhej do|order confirm)\b/ },
  { intent: "deny", re: /\b(nahi|no|cancel|mat bhejo|galat)\b/ },
  { intent: "remove", re: /\b(hatao|hata|remove|delete|nikalo|nikal do)\b/ },
  { intent: "cart", re: /\b(cart|order mein kya|kya pada|summary|bill)\b/ },
  { intent: "menu", re: /\b(menu|kya kya hai|kya milta|available|deal)\b/ },
  { intent: "hours", re: /\b(hours|time|kitne baje|open|band|closing)\b/ },
  { intent: "price", re: /\b(price|keemat|kitne ka|kitna|rate)\b/ },
  { intent: "qty", re: /\b(quantity|kitne piece|aur ek|plus|minus)\b/ },
  { intent: "add", re: /\b(add|do|dena|lena|chahiye|order|mango|burger|zinger|shawarma|fries|wings|nuggets)\b/ },
];

export function nlpIntent(text: string): NlpIntent {
  const n = nlpClean(text);
  if (!n || n.length < 2) return "unclear";
  for (const row of INTENT_RULES) {
    if (row.re.test(n)) return row.intent;
  }
  return "chat";
}

const QTY_WORDS: Record<string, number> = {
  ek: 1,
  one: 1,
  do: 2,
  two: 2,
  teen: 3,
  three: 3,
  char: 4,
  four: 4,
  paanch: 5,
  five: 5,
};

export function nlpQty(text: string): number | null {
  const n = nlpClean(text);
  const digits = n.match(/\b(\d{1,2})\b/);
  if (digits) {
    const v = Number(digits[1]);
    if (v >= 1 && v <= 20) return v;
  }
  for (const [word, qty] of Object.entries(QTY_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) return qty;
  }
  return null;
}

export function nlpSpeakable(text: string): string {
  return text
    .replace(/[\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeUtterance(text: string, fallback: VoiceLang = "ru") {
  const clean = nlpClean(text);
  return {
    raw: text.trim(),
    clean,
    tokens: nlpTokens(text),
    intent: nlpIntent(text),
    qty: nlpQty(text),
    speakable: nlpSpeakable(text) || clean,
    fallback,
  };
}
