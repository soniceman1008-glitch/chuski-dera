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
  return detectVoiceLang(text, fallback ?? "ru");
}

export { isVoiceUnclear, clarifyLanguage } from "./voice-lang";

type Pack = { en: string; ur: string; ru: string; pa: string; hi: string };

function t(lang: AgentLang, pack: Pack) {
  return pack[lang] ?? pack.ru;
}

export function greet(lang: AgentLang = "ru") {
  return t(lang, {
    en: `Hi, welcome to ${RESTAURANT.name}. I can help with the menu, prices, or a delivery order. What would you like?`,
    ur: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔ مینو، قیمت یا آرڈر میں مدد کر سکتی ہوں۔ آپ کیا لینا چاہیں گے؟`,
    ru: `Assalamualaikum, ${RESTAURANT.name} mein khush amdeed. Menu, prices ya order mein help kar sakti hoon. Aap kya lena chahenge?`,
    pa: `Sat sri akaal, ${RESTAURANT.name} vich ji aayan nu. Menu, price ya order vich madad kar sakdi aan. Tusi ki lena chahunde o?`,
    hi: `Namaste, ${RESTAURANT.name} mein aapka swagat hai. Menu, keemat ya order mein madad kar sakti hoon. Aap kya lena chahenge?`,
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
      ru: "Aap ka order khali hai.",
      pa: "Tuhada order khali ae.",
      hi: "Aapka order khali hai.",
    });
  }
  const rows = lines.map((line) => {
    const item = MENU.find((m) => m.id === line.id);
    return item ? `${line.qty}\u00d7 ${item.name} — ${formatRs(item.price * line.qty)}` : "";
  });
  const head = t(lang, {
    en: "Order so far:",
    ur: "اب تک کا آرڈر:",
    ru: "Ab tak ka order:",
    pa: "Hune tak da order:",
    hi: "Ab tak ka order:",
  });
  return `${head}\n${rows.filter(Boolean).join("\n")}\nTotal: ${formatRs(cartTotal(lines))}`;
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
    ru: "Delivery ke liye apna naam bataein.",
    pa: "Delivery lai apna naam dasso.",
    hi: "Delivery ke liye apna naam bataiye.",
  });
}

function askPhone(lang: AgentLang) {
  return t(lang, {
    en: "And your phone number?",
    ur: "اپنا فون نمبر؟",
    ru: "Phone number bataein.",
    pa: "Phone number dasso.",
    hi: "Phone number bataiye.",
  });
}

function askAddress(lang: AgentLang) {
  return t(lang, {
    en: "What is the delivery address in Jhang?",
    ur: "جھنگ میں ڈیلیوری اڈریس؟",
    ru: "Jhang mein delivery address bataein.",
    pa: "Jhang vich delivery address dasso.",
    hi: "Jhang mein delivery address bataiye.",
  });
}

function askConfirm(s: AgentState) {
  return t(s.lang, {
    en: `${summary(s.lines, s.lang)}\n${s.customer.name}, ${s.customer.phone}, ${s.customer.address}. Confirm this order?`,
    ur: `${summary(s.lines, s.lang)}\n${s.customer.name}، ${s.customer.phone}، ${s.customer.address}۔ تصدیق کریں؟`,
    ru: `${summary(s.lines, s.lang)}\n${s.customer.name}, ${s.customer.phone}, ${s.customer.address}. Confirm karun?`,
    pa: `${summary(s.lines, s.lang)}\n${s.customer.name}, ${s.customer.phone}, ${s.customer.address}. Confirm karan?`,
    hi: `${summary(s.lines, s.lang)}\n${s.customer.name}, ${s.customer.phone}, ${s.customer.address}. Confirm karun?`,
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
            ur: "نمبر مکمل نہیں آیا۔ کریب 11 انگیز نمبر بتائیں۔",
            ru: "Number mukammal nahi laga. 11 digit mobile number bataein.",
            pa: "Number pura nahi ae. 11 digit mobile dasso.",
            hi: "Number pura nahi laga. 11 digit mobile bataiye.",
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
            ru: "Order confirm ho gaya. WhatsApp kitchen ticket khul raha hai.",
            pa: "Order confirm ho gaya. WhatsApp ticket khul reha ae.",
            hi: "Order confirm ho gaya. WhatsApp kitchen ticket khul raha hai.",
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
            ru: "Theek hai, send nahi kiya. Kya badalna hai?",
            pa: "Theek ae, send nahi kita. Ki badalna ae?",
            hi: "Theek hai, send nahi kiya. Kya badalna hai?",
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
            ru: "Theek hai. Aur kya chahiye?",
            pa: "Theek ae. Hor ki chahida?",
            hi: "Theek hai. Aur kya chahiye?",
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
          en: `Added ${q}\u00d7 ${item.name}.\n${summary(lines, lang)}\nAnything else, or shall I checkout?`,
          ur: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
          ru: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nKuch aur, ya checkout?`,
          pa: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nHor kujh, ya checkout?`,
          hi: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nKuch aur, ya checkout?`,
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
            en: `Added ${q}\u00d7 ${item.name}.\n${summary(lines, lang)}\nAnything else?`,
            ur: `${q}\u00d7 ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}`,
            ru: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nKuch aur chahiye?`,
            pa: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nHor kujh chahida?`,
            hi: `${q}\u00d7 ${item.name} add ho gaya.\n${summary(lines, lang)}\nKuch aur chahiye?`,
          }),
        ],
      };
    }
    s = { ...s, pendingId: item.id, step: "qty" };
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${item.name} is ${formatRs(item.price)}. ${item.blurb} Want to add it?`,
          ur: `${item.name} ${formatRs(item.price)} ہے۔ ${item.blurb}`,
          ru: `${item.name} ${formatRs(item.price)} hai. ${item.blurb} Add karoon?`,
          pa: `${item.name} ${formatRs(item.price)} ae. ${item.blurb} Add karan?`,
          hi: `${item.name} ${formatRs(item.price)} hai. ${item.blurb} Add karun?`,
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
          en: `We have ${cats}. Which category?`,
          ur: `ہمارے پاس ${cats}۔`,
          ru: `Hamare paas ${cats} hain. Konsi category?`,
          pa: `Saade kol ${cats} ne. Kehri category?`,
          hi: `Hamare paas ${cats} hain. Kaunsi category?`,
        }),
      ],
    };
  }

  if (/\b(where|address|location|kahan|kithe)\b/i.test(text)) {
    const loc = `${RESTAURANT.address}. ${CALL_DISPLAY}`;
    return { state: s, messages: [loc, loc, loc, loc, loc].slice(0, 1) };
  }

  if (/\b(hours|timing|time|kitne baje|open)\b/i.test(text)) {
    return {
      state: s,
      messages: [
        t(lang, {
          en: "We are open 12:00 PM to 12:00 AM.",
          ur: "میں دوپہر 12 بجے رات گھر بجے کھلے ہیں۔",
          ru: "Hum 12:00 PM se 12:00 AM tak khulay hain.",
          pa: "Assi 12:00 PM ton 12:00 AM tak khulle haan.",
          hi: "Hum 12:00 PM se 12:00 AM tak khule hain.",
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
          ru: `Call karein ${CALL_DISPLAY}.`,
          pa: `Call karo ${CALL_DISPLAY}.`,
          hi: `Call kijiye ${CALL_DISPLAY}.`,
        }),
      ],
    };
  }

  return {
    state: s,
    messages: [
      t(lang, {
        en: `I can share Chuski Dera menu prices or take an order. What do you need?`,
        ur: `میں چسکی ڈیرہ کے مینو سے مدد کر سکتی ہوں۔ آپ کیا پوچھنا چاہتے ہیں؟`,
        ru: `Main Chuski Dera ke menu se price ya order mein help kar sakti hoon. Aap kya poochna chahte hain?`,
        pa: `Main Chuski Dera de menu ton price ya order vich madad kar sakdi aan. Tusi ki puchna chahunde o?`,
        hi: `Main Chuski Dera ke menu se keemat ya order mein madad kar sakti hoon. Aap kya poochna chahte hain?`,
      }),
    ],
  };
}

export function isOrderConfirmed(result: { sendWhatsApp?: boolean }) {
  return Boolean(result.sendWhatsApp);
}

export { categoryLabel };
