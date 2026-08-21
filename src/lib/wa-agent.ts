import { CATEGORIES, MENU, RESTAURANT, categoryLabel, formatRs, type MenuItem } from "./menu";
import type { CartLine, Customer } from "./cart-store";
import { cartTotal } from "./cart-store";

export type AgentLang = "en" | "ur" | "ru";
export type AgentStep = "chat" | "qty" | "name" | "phone" | "address" | "confirm";
export type AgentState = {
  lang: AgentLang;
  lines: CartLine[];
  customer: Customer;
  pendingId: string | null;
  step: AgentStep;
};

function norm(s: string) {
  return s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function detectLang(text: string, _fallback?: AgentLang): AgentLang {
  if (/\p{Script=Arabic}/u.test(text)) return "ur";
  const n = norm(text);
  if (/\b(kya|hai|hain|chahiye|kitna|kitne|aap|acha|haan|han|shukriya|theek|mujhe|mera)\b/.test(n)) return "ru";
  if (/\b(the|please|want|would|hello|how many)\b/.test(n)) return "en";
  return _fallback ?? "en";
}

export function isVoiceUnclear(text: string): boolean {
  const n = norm(text);
  if (!n || n === "voice") return true;
  return n.replace(/\d+/g, "").trim().length < 2;
}

export function clarifyLanguage(lang: AgentLang): string {
  if (lang === "ur") return "آواز صاف نہیں آئی۔ براہِ کرم اردو، انگریزی یا پنجابی میں دوبارہ بولیں۔";
  if (lang === "en") return "I didn't catch that clearly. Please speak again in Urdu, English, or Punjabi.";
  return "Awaaz saaf nahi aayi. Please Urdu, English ya Punjabi mein dobara bolein.";
}

function t(lang: AgentLang, pack: { en: string; ur: string; ru: string }) {
  return pack[lang];
}

export function greet(lang: AgentLang = "ru") {
  return t(lang, {
    en: `Hi, welcome to ${RESTAURANT.name}. I can help with the menu, prices, or a delivery order. What would you like?`,
    ur: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔ مینو، قیمت یا آرڈر میں مدد کر سکتی ہوں۔ آپ کیا لینا چاہیں گے؟`,
    ru: `Assalamualaikum, ${RESTAURANT.name} mein khush amdeed. Menu, prices ya order mein help kar sakti hoon. Aap kya lena chahenge?`,
  });
}

export const initialAgentState = (customer?: Partial<Customer>): AgentState => ({
  lang: "ru",
  lines: [],
  customer: { name: customer?.name ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" },
  pendingId: null,
  step: "chat",
});

export function findMenuItems(text: string): MenuItem[] {
  const n = norm(text);
  if (!n) return [];
  const out: MenuItem[] = [];
  for (const item of MENU) {
    const name = norm(item.name);
    if (name && n.includes(name)) out.push(item);
  }
  return out;
}

function summary(lines: CartLine[], lang: AgentLang) {
  if (!lines.length) return t(lang, { en: "Your order is empty.", ur: "آپ کا آرڈر خالی ہے۔", ru: "Aap ka order khali hai." });
  const rows = lines.map((line) => {
    const item = MENU.find((m) => m.id === line.id);
    return item ? `${line.qty}\u00d7 ${item.name} — ${formatRs(item.price * line.qty)}` : "";
  });
  return `${t(lang, { en: "Order so far:", ur: "اب تک کا آرڈر:", ru: "Ab tak ka order:" })}\n${rows.filter(Boolean).join("\n")}\nTotal: ${formatRs(cartTotal(lines))}`;
}

export function agentReply(state: AgentState, raw: string): { state: AgentState; messages: string[]; sendWhatsApp?: boolean } {
  const text = raw.trim();
  if (!text) return { state, messages: [] };
  const lang = detectLang(text, state.lang);
  let s: AgentState = { ...state, lang };
  const items = findMenuItems(text);
  const qtyMatch = norm(text).match(/\b(\d+)\b/);
  const qty = qtyMatch ? Number(qtyMatch[1]) : null;

  if (/\b(hi|hello|salam|assalam|hey)\b/i.test(text)) return { state: s, messages: [greet(lang)] };

  if (items[0]) {
    const item = items[0];
    if (/\b(order|chahiye|add|lena)\b/i.test(text) || (qty && qty >= 1 && qty <= 20)) {
      const q = qty && qty >= 1 && qty <= 20 ? qty : 1;
      const found = s.lines.find((l) => l.id === item.id);
      const lines = found ? s.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + q } : l)) : [...s.lines, { id: item.id, qty: q }];
      s = { ...s, lines };
      return {
        state: s,
        messages: [
          t(lang, {
            en: `Added ${q}\u00d7 ${item.name}.\n${summary(lines, lang)}\nAnything else?`,
            ur: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
            ru: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nKuch aur chahiye?`,
          }),
        ],
      };
    }
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${item.name} is ${formatRs(item.price)}. ${item.blurb} Want to add it?`,
          ur: `${item.name} ${formatRs(item.price)} ہے۔ ${item.blurb}`,
          ru: `${item.name} ${formatRs(item.price)} hai. ${item.blurb} Add karoon?`,
        }),
      ],
    };
  }

  if (/\b(menu|items|kya kya)\b/i.test(text)) {
    const cats = CATEGORIES.filter((c) => c.id !== "all").map((c) => c.label).join(", ");
    return { state: s, messages: [t(lang, { en: `We have ${cats}. Which category?`, ur: `ہمارے پاس ${cats}۔`, ru: `Hamare paas ${cats} hain. Konsi category?` })] };
  }

  if (/\b(where|address|location|kahan)\b/i.test(text)) {
    return { state: s, messages: [`${RESTAURANT.address}. ${RESTAURANT.phoneDisplay}`] };
  }

  return {
    state: s,
    messages: [
      t(lang, {
        en: `I can share Chuski Dera menu prices or take an order. What do you need?`,
        ur: `میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔ آپ کیا پوچھنا چاہتے ہیں؟`,
        ru: `Main Chuski Dera ke menu se price ya order mein help kar sakti hoon. Aap kya poochna chahte hain?`,
      }),
    ],
  };
}

export function isOrderConfirmed(result: { sendWhatsApp?: boolean }) {
  return Boolean(result.sendWhatsApp);
}

export { categoryLabel };
