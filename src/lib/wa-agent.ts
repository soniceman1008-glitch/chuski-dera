import { CATEGORIES, MENU, RESTAURANT, categoryLabel, formatRs, type MenuItem } from "./menu";
import type { CartLine, Customer } from "./cart-store";
import { cartTotal } from "./cart-store";
import { CALL_DISPLAY } from "./phone";
import { detectVoiceLang, type VoiceLang } from "./voice-lang";

export type AgentLang = VoiceLang;
export type AgentStep = "chat" | "qty" | "name" | "phone" | "address" | "confirm";
export type AgentState = {
  lang: AgentLang;
  lines: CartLine[];
  customer: Customer;
  pendingId: string | null;
  step: AgentStep;
};

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\u0900-\u097f\u0a00-\u0a7f\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLang(text: string, fallback?: AgentLang): AgentLang {
  const detected = detectVoiceLang(text, fallback ?? "ur");
  return detected === "en" ? "en" : "ur";
}

export { isVoiceUnclear, clarifyLanguage } from "./voice-lang";

type Pack = { en: string; ur: string; ru: string; pa: string; hi: string };

function t(lang: AgentLang, pack: Pack) {
  if (lang === "en") return pack.en;
  return pack.ur;
}

export function greet(lang: AgentLang = "ur") {
  return t(lang, {
    en: `Hi, welcome to ${RESTAURANT.name}. I can help with the menu, prices, or a delivery order. What would you like?`,
    ur: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔ مینو؁ قیمت یا آرڈر میں مدد کر سکتی ہوں۔ آپ کیا لینا چاہیں گے؟`,
    ru: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔`,
    pa: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔`,
    hi: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔`,
  });
}

export const initialAgentState = (customer?: Partial<Customer>): AgentState => ({
  lang: "ur",
  lines: [],
  customer: { name: customer?.name ?? "", phone: customer?.phone ?? "", address: customer?.address ?? "" },
  pendingId: null,
  step: "chat",
});

export function findMenuItems(text: string): MenuItem[] {
  const n = norm(text);
  if (!n) return [];
  const exact: MenuItem[] = [];
  const fuzzy: MenuItem[] = [];
  for (const item of MENU) {
    const name = norm(item.name);
    if (name && n.includes(name)) exact.push(item);
    else {
      const first = name.split(" ")[0] ?? "";
      if (first.length > 3 && n.includes(first)) fuzzy.push(item);
    }
  }
  return exact.length ? exact : fuzzy;
}

function summary(lines: CartLine[], lang: AgentLang) {
  if (!lines.length) {
    return t(lang, {
      en: "Your order is empty.",
      ur: "آپ کا آرڈر خالی ہے۔",
      ru: "آپ کا آرڈر خالی ہے۔",
      pa: "آپ کا آرڈر خالی ہے۔",
      hi: "آپ کا آرڈر خالی ہے۔",
    });
  }
  const rows = lines.map((line) => {
    const item = MENU.find((m) => m.id === line.id);
    return item ? `${line.qty}\u00d7 ${item.name} — ${formatRs(item.price * line.qty)}` : "";
  });
  const head = t(lang, {
    en: "Order so far:",
    ur: "اب تک کا آرڈر:",
    ru: "اب تک کا آرڈر:",
    pa: "اب تک کا آرڈر:",
    hi: "اب تک کا آرڈر:",
  });
  return `${head}\n${rows.filter(Boolean).join("\n")}\nکل: ${formatRs(cartTotal(lines))}`;
}

function isYes(n: string) {
  return /\b(haan|han|yes|yeah|yep|ji|ok|okay|theek|sahi|confirm|karo|add karo|ha)\b/.test(n);
}

function isNo(n: string) {
  return /\b(nahi|nahin|na|no|cancel|mat|band)\b/.test(n);
}

function wantsCheckout(n: string) {
  return /\b(checkout|place order|order confirm|confirm order|order karo|order kar do|whatsapp|bas yehi|that's all|thats all|done|complete order)\b/.test(
    n,
  );
}

function askName(lang: AgentLang) {
  return t(lang, {
    en: "Please tell me your name for delivery.",
    ur: "براہِ کرم اپنا نام بتائیں۔",
    ru: "براہِ کرم اپنا نام بتائیں۔",
    pa: "براہِ کرم اپنا نام بتائیں۔",
    hi: "براہِ کرم اپنا نام بتائیں۔",
  });
}

function askPhone(lang: AgentLang) {
  return t(lang, {
    en: "And your phone number?",
    ur: "اپنا فون نمبر؟",
    ru: "اپنا فون نمبر؟",
    pa: "اپنا فون نمبر؟",
    hi: "اپنا فون نمبر؟",
  });
}

function askAddress(lang: AgentLang) {
  return t(lang, {
    en: "What is the delivery address in Jhang?",
    ur: "جھنگ میں ڈیلیوری اڈریس؟",
    ru: "جھنگ میں ڈیلیوری اڈریس؟",
    pa: "جھنگ میں ڈیلیوری اڈریس؟",
    hi: "جھنگ میں ڈیلیوری اڈریس؟",
  });
}

function askConfirm(s: AgentState) {
  return t(s.lang, {
    en: `${summary(s.lines, s.lang)}\n${s.customer.name}, ${s.customer.phone}, ${s.customer.address}. Confirm this order?`,
    ur: `${summary(s.lines, s.lang)}\n${s.customer.name}، ${s.customer.phone}، ${s.customer.address}۔ تصدیق کریں؟`,
    ru: `${summary(s.lines, s.lang)}\n${s.customer.name}، ${s.customer.phone}، ${s.customer.address}۔ تصدیق کریں؟`,
    pa: `${summary(s.lines, s.lang)}\n${s.customer.name}، ${s.customer.phone}، ${s.customer.address}۔ تصدیق کریں؟`,
    hi: `${summary(s.lines, s.lang)}\n${s.customer.name}، ${s.customer.phone}، ${s.customer.address}۔ تصدیق کریں؟`,
  });
}

function beginCheckout(s: AgentState): { state: AgentState; messages: string[] } {
  if (!s.customer.name) return { state: { ...s, step: "name" }, messages: [askName(s.lang)] };
  if (!s.customer.phone) return { state: { ...s, step: "phone" }, messages: [askPhone(s.lang)] };
  if (!s.customer.address) return { state: { ...s, step: "address" }, messages: [askAddress(s.lang)] };
  return { state: { ...s, step: "confirm" }, messages: [askConfirm(s)] };
}

export function agentReply(
  state: AgentState,
  raw: string,
): { state: AgentState; messages: string[]; sendWhatsApp?: boolean } {
  const text = raw.trim();
  if (!text) return { state, messages: [] };
  const lang = detectLang(text, state.lang);
  let s: AgentState = { ...state, lang };
  const n = norm(text);
  const items = findMenuItems(text);
  const qtyMatch = n.match(/\b(\d{1,2})\b/);
  const qty = qtyMatch ? Number(qtyMatch[1]) : null;

  if (s.step === "name") {
    if (text.length < 2) return { state: s, messages: [askName(lang)] };
    s = { ...s, customer: { ...s.customer, name: text.slice(0, 80) }, step: "phone" };
    return { state: s, messages: [askPhone(lang)] };
  }

  if (s.step === "phone") {
    const digits = text.replace(/\D/g, "");
    if (digits.length < 10) {
      return {
        state: s,
        messages: [
          t(lang, {
            en: "That number looks short. Please say an 11-digit Pakistani mobile number.",
            ur: "نمبر مکمل نہیں آیا۔ گیارہ گنے پاکستانی موبائل نمبر بتائیں۔",
            ru: "نمبر مکمل نہیں آیا۔",
            pa: "نمبر مکمل نہیں آیا۔",
            hi: "نمبر مکمل نہیں آیا۔",
          }),
        ],
      };
    }
    s = { ...s, customer: { ...s.customer, phone: text.slice(0, 30) }, step: "address" };
    return { state: s, messages: [askAddress(lang)] };
  }

  if (s.step === "address") {
    if (text.length < 5) return { state: s, messages: [askAddress(lang)] };
    s = { ...s, customer: { ...s.customer, address: text.slice(0, 200) }, step: "confirm" };
    return { state: s, messages: [askConfirm(s)] };
  }

  if (s.step === "confirm") {
    if (isYes(n)) {
      return {
        state: { ...s, step: "chat" },
        messages: [
          t(lang, {
            en: "Order confirmed. Opening WhatsApp for the kitchen ticket.",
            ur: "آرڈر تصدیق ہو گیا۔ واٹساپ کھل رہا ہوں۔",
            ru: "آرڈر تصدیق ہو گیا۔",
            pa: "آرڈر تصدیق ہو گیا۔",
            hi: "آرڈر تصدیق ہو گیا۔",
          }),
        ],
        sendWhatsApp: true,
      };
    }
    if (isNo(n)) {
      return {
        state: { ...s, step: "chat" },
        messages: [
          t(lang, {
            en: "Okay, not sent. Tell me what to change.",
            ur: "ٹھیک ہے، بھیجا نہیں ہوا۔ کیا بدلنا ہے؟",
            ru: "ٹھیک ہے، بھیجا نہیں ہوا۔",
            pa: "ٹھیک ہے، بھیجا نہیں ہوا۔",
            hi: "ٹھیک ہے، بھیجا نہیں ہوا۔",
          }),
        ],
      };
    }
    return { state: s, messages: [askConfirm(s)] };
  }

  if (s.step === "qty" && s.pendingId) {
    const item = MENU.find((m) => m.id === s.pendingId);
    const q = qty && qty >= 1 && qty <= 20 ? qty : isYes(n) ? 1 : 0;
    if (!item || !q) {
      return {
        state: { ...s, pendingId: null, step: "chat" },
        messages: [
          t(lang, {
            en: "Okay. What else would you like?",
            ur: "ٹھیک ہے۔ اور کیا چاہیے؟",
            ru: "ٹھیک ہے۔ اور کیا چاہیے؟",
            pa: "ٹھیک ہے۔ اور کیا چاہیے؟",
            hi: "ٹھیک ہے۔ اور کیا چاہیے؟",
          }),
        ],
      };
    }
    const found = s.lines.find((l) => l.id === item.id);
    const lines = found
      ? s.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + q } : l))
      : [...s.lines, { id: item.id, qty: q }];
    s = { ...s, lines, pendingId: null, step: "chat" };
    return {
      state: s,
      messages: [
        t(lang, {
          en: `Added ${q}\u00d7 ${item.name}.`,
          ur: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
          ru: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
          pa: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
          hi: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
        }),
      ],
    };
  }

  if (/\b(hi|hello|salam|assalam|hey|namaste|sat sri)\b/i.test(text) && !items[0]) {
    return { state: s, messages: [greet(lang)] };
  }

  if (s.lines.length && wantsCheckout(n)) {
    return beginCheckout(s);
  }

  if (items[0]) {
    const item = items[0];
    if (/\b(order|chahiye|add|lena|chahida|lo)\b/i.test(text) || (qty && qty >= 1 && qty <= 20)) {
      const q = qty && qty >= 1 && qty <= 20 ? qty : 1;
      const found = s.lines.find((l) => l.id === item.id);
      const lines = found
        ? s.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + q } : l))
        : [...s.lines, { id: item.id, qty: q }];
      s = { ...s, lines, pendingId: null, step: "chat" };
      return {
        state: s,
        messages: [
          t(lang, {
            en: `Added ${q}\u00d7 ${item.name}.`,
            ur: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
            ru: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
            pa: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
            hi: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
          }),
        ],
      };
    }
    s = { ...s, pendingId: item.id, step: "qty" };
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${item.name} is ${formatRs(item.price)}.`,
          ur: `${item.name} ${formatRs(item.price)} ہے۔ ${item.blurb} شامل کروں؟`,
          ru: `${item.name} ${formatRs(item.price)} ہے۔`,
          pa: `${item.name} ${formatRs(item.price)} ہے۔`,
          hi: `${item.name} ${formatRs(item.price)} ہے۔`,
        }),
      ],
    };
  }

  if (/\b(menu|items|kya kya|ki ki|kya milta)\b/i.test(text)) {
    const cats = CATEGORIES.filter((c) => c.id !== "all")
      .map((c) => c.label)
      .join(", ");
    return {
      state: s,
      messages: [
        t(lang, {
          en: `We have ${cats}.`,
          ur: `ہمارے پاس ${cats}۔ کون سی کیٹیگری؟`,
          ru: `ہمارے پاس ${cats}۔`,
          pa: `ہمارے پاس ${cats}۔`,
          hi: `ہمارے پاس ${cats}۔`,
        }),
      ],
    };
  }

  if (/\b(where|address|location|kahan|kithe)\b/i.test(text)) {
    return { state: s, messages: [`${RESTAURANT.address}۔ ${CALL_DISPLAY}`] };
  }

  if (/\b(hours|timing|time|kitne baje|open)\b/i.test(text)) {
    return {
      state: s,
      messages: [
        t(lang, {
          en: "We are open 12:00 PM to 12:00 AM.",
          ur: "ہم دوپہر 12 بجے سے رات 12 بجے تک کھلے ہیں۔",
          ru: "ہم دوپہر 12 بجے سے رات 12 بجے تک کھلے ہیں۔",
          pa: "ہم دوپہر 12 بجے سے رات 12 بجے تک کھلے ہیں۔",
          hi: "ہم دوپہر 12 بجے سے رات 12 بجے تک کھلے ہیں۔",
        }),
      ],
    };
  }

  if (/\b(phone|number|call|contact)\b/i.test(text)) {
    return {
      state: s,
      messages: [
        t(lang, {
          en: `Call ${CALL_DISPLAY}.`,
          ur: `کال کریں ${CALL_DISPLAY}۔`,
          ru: `کال کریں ${CALL_DISPLAY}۔`,
          pa: `کال کریں ${CALL_DISPLAY}۔`,
          hi: `کال کریں ${CALL_DISPLAY}۔`,
        }),
      ],
    };
  }

  return {
    state: s,
    messages: [
      t(lang, {
        en: `I can share Chuski Dera menu prices or take an order.`,
        ur: "میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔ آپ کیا پوچنا چاہتے ہیں؟",
        ru: "میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔",
        pa: "میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔",
        hi: "میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔",
      }),
    ],
  };
}

export function isOrderConfirmed(result: { sendWhatsApp?: boolean }) {
  return Boolean(result.sendWhatsApp);
}

export { categoryLabel };
