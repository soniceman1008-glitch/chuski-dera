import { CATEGORIES, MENU, RESTAURANT, categoryLabel, findItem, formatRs, type MenuItem } from "./menu";
import type { CartLine, Customer } from "./cart-store";
import { detectVoiceLang, type VoiceLang } from "./voice-lang";
import { nlpClean, nlpIntent, nlpQty } from "./nlp";
import { normalizePkPhone } from "./phone";

export type AgentLang = VoiceLang;
export type AgentStep = "chat" | "qty" | "name" | "phone" | "address" | "confirm";
export type AgentState = {
  lang: AgentLang;
  lines: CartLine[];
  customer: Customer;
  pendingId: string | null;
  step: AgentStep;
  promoCode: string;
};

export function detectLang(text: string, fallback?: AgentLang): AgentLang {
  return detectVoiceLang(text, fallback ?? "ur");
}

export { isVoiceUnclear, clarifyLanguage } from "./voice-lang";

type Pack = { en: string; ur: string; ru: string; pa: string; hi: string };
function t(lang: AgentLang, pack: Pack) {
  return pack[lang] ?? pack.en;
}

export function greet(lang: AgentLang = "ur") {
  return t(lang, {
    en: `Hi, welcome to ${RESTAURANT.name}. I can help with the menu, prices, or a delivery order. What would you like?`,
    ur: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔ مینو، قیمت یا آرڈر میں مدد کر سکتی ہوں۔ آپ کیا لینا چاہیں گے؟`,
    ru: `Assalamualaikum, ${RESTAURANT.name} mein khush amdeed. Menu, prices ya order mein help kar sakti hoon. Aap kya lena chahenge?`,
    pa: `Sat sri akaal, ${RESTAURANT.name} vich ji aayan nu. Menu, price ya order vich madad kar sakdi aan. Tusi ki lena chahunde o?`,
    hi: `Namaste, ${RESTAURANT.name} mein aapka swagat hai. Menu, keemat ya order mein madad kar sakti hoon. Aap kya lena chahenge?`,
  });
}

export const initialAgentState = (customer?: Partial<Customer>): AgentState => ({
  lang: "ur",
  lines: [],
  customer: { name: customer?.name ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" },
  pendingId: null,
  step: "chat",
  promoCode: "",
});

function confirmationDecision(text: string): "confirm" | "reject" | "unclear" {
  const n = text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(nahi|nahin|no|nope|cancel|mat|galat)(?:\s+\w+){0,3}$/i.test(n)) return "reject";
  if (
    /^(haan ji|ji haan|haan|han|yes|yeah|yep|confirm|confirmed|i confirm)(?:\s+(please|karo|kardo|kar do|bhej|bhejo|do|it|confirm|haan|han|yes))?$/i.test(
      n,
    )
  ) {
    return "confirm";
  }
  return "unclear";
}

function findMenuItems(text: string): MenuItem[] {
  const n = nlpClean(text);
  if (!n) return [];
  const exact = MENU.filter((item) => n.includes(nlpClean(item.name)));
  if (exact.length) return exact.slice(0, 1);
  if (n.includes("zinger")) return MENU.filter((item) => item.id === "zinger").slice(0, 1);
  if (n.includes("shawarma")) return MENU.filter((item) => item.id === "chicken-shawarma-s").slice(0, 1);
  if (n.includes("nuggets")) return MENU.filter((item) => item.id === "nuggets-5").slice(0, 1);
  return MENU.filter((item) => nlpClean(item.name).split(" ").some((w) => w.length > 3 && n.includes(w))).slice(0, 1);
}

function summary(lines: CartLine[], lang: AgentLang) {
  if (!lines.length) {
    return t(lang, {
      en: "Your order is empty.",
      ur: "آپ کا آرڈر خالی ہے۔",
      ru: "Aap ka order khali hai.",
      pa: "Tuhada order khali ae.",
      hi: "Aapka order khali hai.",
    });
  }
  const rows = lines.map((l) => {
    const item = findItem(l.id);
    return `${l.qty}x ${item?.name ?? l.id} — ${formatRs((item?.price ?? 0) * l.qty)}`;
  });
  const total = lines.reduce((n, l) => n + (findItem(l.id)?.price ?? 0) * l.qty, 0);
  rows.push(`Total: ${formatRs(total)}`);
  return `${t(lang, { en: "Order so far:", ur: "اب تک کا آرڈر:", ru: "Ab tak ka order:", pa: "Hune tak da order:", hi: "Ab tak ka order:" })}\n${rows.join("\n")}`;
}

function addItem(s: AgentState, item: MenuItem, qty: number): AgentState {
  const found = s.lines.find((l) => l.id === item.id);
  const lines = found
    ? s.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + qty } : l))
    : [...s.lines, { id: item.id, qty }];
  return { ...s, lines };
}

export function agentReply(
  state: AgentState,
  raw: string,
): { state: AgentState; messages: string[]; sendWhatsApp?: boolean } {
  const text = raw.trim();
  if (!text) return { state, messages: [] };
  const lang = detectLang(text);
  let s: AgentState = { ...state, lang, customer: { ...state.customer }, lines: [...state.lines] };

  if (s.step === "chat" && !s.pendingId && nlpIntent(text) === "unclear") {
    return {
      state: s,
      messages: [
        t(lang, {
          en: "I did not catch that. Please say the item slowly, like zinger burger.",
          ur: "آواز صاف نہیں آئی۔ آہستہ آئٹم کا نام بولیں، جیسے زنگر برگر۔",
          ru: "Awaaz saaf nahi aayi. Dheere item ka naam boliye, jaise zinger burger.",
          pa: "Awaaz saaf nahi aayi. Dheere item da naam daso, jiven zinger burger.",
          hi: "Awaaz saaf nahi aayi. Dheere item ka naam boliye, jaise zinger burger.",
        }),
      ],
    };
  }

  if (s.step === "name") {
    const name = text.replace(/mera naam|my name is|naam hai|naam/gi, "").trim();
    if (name.length < 2) return { state: s, messages: [t(lang, { en: "Please tell me your name.", ur: "براہِ کرم اپنا نام بتائیں۔", ru: "Apna naam bataiye.", pa: "Apna naam dasso.", hi: "Apna naam bataiye." })] };
    s.customer.name = name.slice(0, 80);
    s.step = "phone";
    return { state: s, messages: [t(lang, { en: "Please share your phone number.", ur: "اپنا فون نمبر بتائیں۔", ru: "Apna phone number bataiye.", pa: "Apna phone number dasso.", hi: "Apna phone number dijiye." })] };
  }

  if (s.step === "phone") {
    const phone = normalizePkPhone(text);
    if (!phone) return { state: s, messages: [t(lang, { en: "Please say the full mobile number.", ur: "پورا موبائل نمبر بتائیں۔", ru: "Poora mobile number bataiye.", pa: "Pura mobile number dasso.", hi: "Poora mobile number dijiye." })] };
    s.customer.phone = phone;
    s.step = "address";
    return { state: s, messages: [t(lang, { en: "Please share your delivery address in Jhang.", ur: "جھنگ میں اپنا ڈیلیوری ایڈریس بتائیں۔", ru: "Jhang mein apna delivery address bataiye.", pa: "Jhang vich apna delivery address dasso.", hi: "Jhang mein apna delivery address dijiye." })] };
  }

  if (s.step === "address") {
    if (text.length < 6) return { state: s, messages: [t(lang, { en: "Please share your delivery address in Jhang.", ur: "جھنگ میں اپنا ڈیلیوری ایڈریس بتائیں۔", ru: "Jhang mein apna delivery address bataiye.", pa: "Jhang vich apna delivery address dasso.", hi: "Jhang mein apna delivery address dijiye." })] };
    s.customer.address = text.slice(0, 200);
    s.step = "confirm";
    return { state: s, messages: [`${summary(s.lines, lang)}\nName: ${s.customer.name}\nPhone: ${s.customer.phone}\nDeliver to: ${s.customer.address}\nSay yes to send, or no to change.`] };
  }

  if (s.step === "confirm") {
    const decision = confirmationDecision(text);
    if (decision === "reject") {
      s.step = "chat";
      return { state: s, messages: [t(lang, { en: "Okay, cancelled.", ur: "ٹھیک ہے، آرڈر کینسل ہے۔", ru: "Theek hai, order cancel hai.", pa: "Theek ae, order cancel.", hi: "Theek hai, order cancel hai." })] };
    }
    if (decision === "confirm") {
      s.step = "chat";
      return {
        state: s,
        messages: [t(lang, { en: "Sending your ticket on WhatsApp to the kitchen now.", ur: "آپ کا آرڈر واٹس ایپ پر کچن کو بھیج رہی ہوں۔", ru: "Aap ka order WhatsApp par kitchen ko bhej rahi hoon.", pa: "Tuhada order WhatsApp te kitchen nu bhej rahi aan.", hi: "Aapka order WhatsApp par kitchen ko bhej rahi hoon." })],
        sendWhatsApp: true,
      };
    }
    return { state: s, messages: [t(lang, { en: "Please say yes or confirm.", ur: "براہِ کرم ہاں کہیں۔", ru: "Haan ya confirm boliye.", pa: "Haan ya confirm ako.", hi: "Haan ya confirm boliye." })] };
  }

  if (/\b(bas|checkout|confirm|order karo|place order|done|bill)\b/i.test(text)) {
    if (!s.lines.length) {
      return { state: s, messages: [t(lang, { en: "Cart is empty. Tell me an item first, like Zinger Burger.", ur: "کارٹ خالی ہے۔ پہلے آئٹم بتائیں، جیسے زنگر برگر۔", ru: "Cart khali hai. Pehle item bataiye, jaise Zinger Burger.", pa: "Cart khali ae. Pehlan item dasso, jiven Zinger Burger.", hi: "Cart khali hai. Pehle item bataiye, jaise Zinger Burger." })] };
    }
    if (!s.customer.name.trim()) {
      s.step = "name";
      return { state: s, messages: [t(lang, { en: "Please tell me your name.", ur: "براہِ کرم اپنا نام بتائیں۔", ru: "Apna naam bataiye.", pa: "Apna naam dasso.", hi: "Apna naam bataiye." })] };
    }
    s.step = "confirm";
    return { state: s, messages: [summary(s.lines, lang)] };
  }

  if (s.pendingId && /\b(5|10|small|large|bada|chota)\b/i.test(text)) {
    const pending = findItem(s.pendingId);
    if (pending) {
      let item = pending;
      if (/\b(10|ten)\b/i.test(text) && pending.id.startsWith("nuggets")) item = findItem("nuggets-10") ?? pending;
      if (/\b(5|five)\b/i.test(text) && pending.id.startsWith("nuggets")) item = findItem("nuggets-5") ?? pending;
      if (/\b(large|bada)\b/i.test(text) && pending.id.includes("shawarma")) item = findItem("chicken-shawarma-l") ?? pending;
      if (/\b(small|chota)\b/i.test(text) && pending.id.includes("shawarma")) item = findItem("chicken-shawarma-s") ?? pending;
      s.pendingId = null;
      s = addItem(s, item, 1);
      return { state: s, messages: [t(lang, { en: `Added ${item.name}.\n${summary(s.lines, lang)}`, ur: `${item.name} شامل ہو گیا۔\n${summary(s.lines, lang)}`, ru: `${item.name} add ho gaya.\n${summary(s.lines, lang)}`, pa: `${item.name} add ho gaya.\n${summary(s.lines, lang)}`, hi: `${item.name} add ho gaya.\n${summary(s.lines, lang)}` })] };
    }
  }

  if (/\bnuggets\b/i.test(text) && !/\b(5|10)\b/.test(text)) {
    s.pendingId = "nuggets-5";
    return { state: s, messages: ["Nuggets 5 pieces or 10 pieces?"] };
  }
  if (/\bshawarma\b/i.test(text) && !/\b(small|large|zinger|nuggets)\b/i.test(text)) {
    s.pendingId = "chicken-shawarma-s";
    return { state: s, messages: ["Small Chicken Shawarma or Large?"] };
  }

  const items = findMenuItems(text);
  const qty = nlpQty(text) ?? 1;
  if (items[0] && /\b(chahiye|add|order|lena|want)\b/i.test(text)) {
    s = addItem(s, items[0], qty);
    return { state: s, messages: [t(lang, { en: `Added ${qty}x ${items[0].name}.\n${summary(s.lines, lang)}`, ur: `${qty}x ${items[0].name} شامل ہو گیا۔\n${summary(s.lines, lang)}`, ru: `${qty}x ${items[0].name} add ho gaya.\n${summary(s.lines, lang)}`, pa: `${qty}x ${items[0].name} add ho gaya.\n${summary(s.lines, lang)}`, hi: `${qty}x ${items[0].name} add ho gaya.\n${summary(s.lines, lang)}` })] };
  }
  if (items[0]) {
    s.pendingId = items[0].id;
    return { state: s, messages: [`${items[0].name} is ${formatRs(items[0].price)}. Want to add it?`] };
  }

  if (/\b(menu|items)\b/i.test(text)) {
    const cats = CATEGORIES.filter((c) => c.id !== "all").map((c) => c.label).join(", ");
    return { state: s, messages: [t(lang, { en: `We have ${cats}. Which category?`, ur: `ہمارے پاس ${cats}۔`, ru: `Hamare paas ${cats} hain.`, pa: `Saade kol ${cats} ne.`, hi: `Hamare paas ${cats} hain.` })] };
  }

  return {
    state: s,
    messages: [
      t(lang, {
        en: "I can share Chuski Dera menu prices or take an order. What do you need?",
        ur: "میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔ آپ کیا پوچھنا چاہتے ہیں؟",
        ru: "Main Chuski Dera ke menu se help kar sakti hoon.",
        pa: "Main Chuski Dera de menu ton madad kar sakdi aan.",
        hi: "Main Chuski Dera ke menu se madad kar sakti hoon.",
      }),
    ],
  };
}

export function isOrderConfirmed(result: { sendWhatsApp?: boolean }) {
  return Boolean(result.sendWhatsApp);
}

export { categoryLabel };
