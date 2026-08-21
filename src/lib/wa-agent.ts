import {
  CATEGORIES,
  MENU,
  RESTAURANT,
  categoryLabel,
  formatRs,
  type CategoryId,
  type MenuItem,
} from "./menu";
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

const UNKNOWN = {
  en: `That isn't in our menu data. Please call ${RESTAURANT.callDisplay} so we can confirm.`,
  ur: `یہ تفصیل ہمارے مینو میں نہیں۔ براہِ کرم ${RESTAURANT.callDisplay} پر کال کریں۔`,
  ru: `Yeh detail hamare menu mein nahi. Please ${RESTAURANT.callDisplay} par call karein.`,
};

const ALIASES: { id: string; keys: string[] }[] = [
  { id: "double-dekar", keys: ["double dekar", "double burger", "dekar"] },
  { id: "tower", keys: ["tower burger", "tower"] },
  { id: "zinger-cheese", keys: ["zinger cheese", "cheese zinger", "zinger cheese burger"] },
  { id: "zinger", keys: ["zinger burger", "zinger"] },
  { id: "pattie", keys: ["pattie", "patty burger", "pattie burger"] },
  { id: "chapli", keys: ["chapli"] },
  { id: "zinger-shawarma", keys: ["zinger shawarma"] },
  { id: "nuggets-shawarma", keys: ["nuggets shawarma", "nugget shawarma"] },
  { id: "platter-shawarma", keys: ["platter shawarma", "plater shawarma", "shawarma platter"] },
  { id: "chicken-shawarma-s", keys: ["chicken shawarma small", "small shawarma"] },
  { id: "chicken-shawarma-l", keys: ["chicken shawarma large", "large shawarma"] },
  { id: "tortilla", keys: ["tortilla wrap", "tortilla"] },
  { id: "grilled-wrap", keys: ["grilled wrap"] },
  { id: "malai-roll", keys: ["malai boti", "malai roll"] },
  { id: "chicken-roll", keys: ["chicken paratha", "chicken roll"] },
  { id: "nuggets-5", keys: ["nuggets 5", "5 nuggets", "nuggets (5"] },
  { id: "nuggets-10", keys: ["nuggets 10", "10 nuggets"] },
  { id: "wings-5", keys: ["hot wings 5", "5 wings", "5 hot wings"] },
  { id: "wings-10", keys: ["hot wings 10", "10 wings", "10 hot wings"] },
  { id: "fries", keys: ["simple fries", "plain fries"] },
  { id: "sausi-fries", keys: ["sausi fries", "saucy fries"] },
  { id: "loaded-fries", keys: ["loaded fries"] },
  { id: "falsa", keys: ["falsa"] },
  { id: "peach-juice", keys: ["peach juice", "peach"] },
  { id: "fresh-lime", keys: ["fresh lime", "lime juice"] },
  { id: "banana-shake", keys: ["banana shake", "banana"] },
  { id: "apple-shake", keys: ["apple shake"] },
  { id: "mango-shake", keys: ["mango shake", "mango"] },
  { id: "pina-colada", keys: ["pina colada"] },
  { id: "oreo-shake", keys: ["oreo"] },
  { id: "iced-chocolate-shake", keys: ["iced chocolate"] },
  { id: "chocolate-pb-shake", keys: ["peanut butter", "chocolate peanut"] },
  { id: "bounty-shake", keys: ["bounty"] },
  { id: "date-delight", keys: ["date delight", "khajoor"] },
  { id: "green-apple-smoothie", keys: ["green apple smoothie"] },
  { id: "blueberry-smoothie", keys: ["blue berry smoothie", "blueberry smoothie"] },
  { id: "kiwi-smoothie", keys: ["kiwi smoothie"] },
  { id: "iced-latte", keys: ["iced latte", "latte"] },
  { id: "iced-cappuccino", keys: ["iced cappuccino", "cappuccino"] },
  { id: "iced-mocha", keys: ["iced mocha", "mocha"] },
  { id: "butterscotch-bliss", keys: ["butterscotch"] },
  { id: "coco-loco", keys: ["coco loco"] },
  { id: "cookies-n-cream", keys: ["cookies n cream", "cookies 'n' cream"] },
  { id: "caramel-delight", keys: ["caramel delight", "caramel"] },
  { id: "hazelnut-heaven", keys: ["hazelnut"] },
  { id: "special-chocolate-frappe", keys: ["special chocolate"] },
  { id: "plain-tea", keys: ["plain tea", "chai", "tea cup"] },
  { id: "cardamom-tea", keys: ["cardamom tea", "elaichi"] },
  { id: "kulfa-shake", keys: ["kulfa"] },
  { id: "vanilla-shake", keys: ["vanilla"] },
  { id: "chocolate-ice-shake", keys: ["chocolate ice cream"] },
  { id: "strawberry-ice-shake", keys: ["strawberry"] },
  { id: "lime-italian-soda", keys: ["lime italian", "lime soda"] },
  { id: "kiwi-italian-soda", keys: ["kiwi italian", "kiwi soda"] },
  { id: "green-apple-soda", keys: ["green apple soda"] },
  { id: "blueberry-soda", keys: ["blue berry soda", "blueberry soda"] },
  { id: "mint-margaretta", keys: ["mint margaretta", "mint"] },
];

const CAT_KEYS: { id: CategoryId; keys: string[] }[] = [
  { id: "burgers", keys: ["burger", "burgers"] },
  { id: "shawarma", keys: ["shawarma"] },
  { id: "wraps", keys: ["wrap", "roll", "paratha"] },
  { id: "sides", keys: ["fries", "nugget", "wings", "sides"] },
  { id: "juice", keys: ["juice"] },
  { id: "simple-shakes", keys: ["simple shake"] },
  { id: "special-shakes", keys: ["special shake"] },
  { id: "smoothies", keys: ["smoothie"] },
  { id: "coffee", keys: ["coffee", "latte", "cappuccino"] },
  { id: "frappe", keys: ["frappe", "frappuccino"] },
  { id: "tea", keys: ["tea", "chai"] },
  { id: "ice-cream-shake", keys: ["ice cream"] },
  { id: "soda", keys: ["soda", "italian soda"] },
];

const URDU_NUM: Record<string, number> = {
  ek: 1, aik: 1, one: 1,
  do: 2, two: 2,
  teen: 3, three: 3,
  char: 4, four: 4,
  panch: 5, paanch: 5, five: 5,
  che: 6, chhe: 6, six: 6,
  saat: 7, seven: 7,
  aath: 8, eight: 8,
  nau: 9, nine: 9,
  das: 10, ten: 10,
};

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLang(text: string): AgentLang {
  if (/\p{Script=Arabic}/u.test(text)) return "ur";
  const n = norm(text);
  if (
    /\b(kya|hai|hain|chahiye|kitna|kitne|ka|ki|ke|aap|acha|haan|han|order|price|menu|shukriya|theek)\b/.test(
      n,
    )
  ) {
    return "ru";
  }
  return "en";
}

function t(lang: AgentLang, pack: { en: string; ur: string; ru: string }) {
  return pack[lang];
}

export function findMenuItems(text: string): MenuItem[] {
  const n = norm(text);
  if (!n) return [];
  const scored: { item: MenuItem; score: number }[] = [];

  for (const row of ALIASES) {
    for (const key of row.keys) {
      if (n.includes(key)) {
        const item = MENU.find((m) => m.id === row.id);
        if (item) scored.push({ item, score: key.length });
      }
    }
  }

  for (const item of MENU) {
    const name = norm(item.name);
    if (n.includes(name)) scored.push({ item, score: name.length + 10 });
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: MenuItem[] = [];
  for (const row of scored) {
    if (seen.has(row.item.id)) continue;
    seen.add(row.item.id);
    out.push(row.item);
  }
  return out;
}

function parseQty(text: string): number | null {
  const n = norm(text);
  const m = n.match(/\b(\d+)\b/);
  if (m) {
    const q = Number(m[1]);
    if (q >= 1 && q <= 20) return q;
  }
  for (const [word, q] of Object.entries(URDU_NUM)) {
    if (new RegExp(`\\b${word}\\b`).test(n)) return q;
  }
  return null;
}

function findCategory(text: string): CategoryId | null {
  const n = norm(text);
  let best: { id: CategoryId; len: number } | null = null;
  for (const row of CAT_KEYS) {
    for (const key of row.keys) {
      if (n.includes(key) && (!best || key.length > best.len)) best = { id: row.id, len: key.length };
    }
  }
  return best?.id ?? null;
}

function isYes(text: string) {
  return /\b(yes|yeah|yep|ok|okay|confirm|haan|han|ha|ji|theek|bilkul|ہاں|جی|ٹھیک)\b/i.test(text);
}
function isNo(text: string) {
  return /\b(no|nah|cancel|nahi|naheen|mat|نہیں)\b/i.test(text);
}

function wantsPrice(text: string) {
  return /\b(price|kitna|kitne|kitni|cost|rs|rupees|قیمت|کتنا|کتنے)\b/i.test(text);
}
function wantsMenu(text: string) {
  return /\b(menu|items|kya kya|available|مینو)\b/i.test(text);
}
function wantsOrder(text: string) {
  return /\b(order|book|chahiye|lena|do na|add|cart|آرڈر)\b/i.test(text);
}
function wantsRemove(text: string) {
  return /\b(remove|delete|hatado|hata do|cancel item)\b/i.test(text);
}
function wantsHours(text: string) {
  return /\b(hours|timing|open|close|kitne baje|وقت)\b/i.test(text);
}

function itemLine(item: MenuItem) {
  return `${item.name} — ${formatRs(item.price)}`;
}

function summary(lines: CartLine[], lang: AgentLang) {
  if (!lines.length) {
    return t(lang, {
      en: "Your order is empty.",
      ur: "آپ کا آرڈر خالی ہے۔",
      ru: "Aap ka order khali hai.",
    });
  }
  const rows = lines.map((line) => {
    const item = MENU.find((m) => m.id === line.id);
    if (!item) return "";
    return `${line.qty}× ${item.name} — ${formatRs(item.price * line.qty)}`;
  });
  const sub = cartTotal(lines);
  const head = t(lang, {
    en: "Order so far:",
    ur: "اب تک کا آرڈر:",
    ru: "Ab tak ka order:",
  });
  return `${head}\n${rows.filter(Boolean).join("\n")}\nSubtotal: ${formatRs(sub)}\nDelivery: Free\nGrand total: ${formatRs(sub)}`;
}

function addLine(lines: CartLine[], id: string, qty: number): CartLine[] {
  const found = lines.find((l) => l.id === id);
  if (found) return lines.map((l) => (l.id === id ? { ...l, qty: l.qty + qty } : l));
  return [...lines, { id, qty }];
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
  customer: {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
  },
  pendingId: null,
  step: "chat",
});

function askQty(item: MenuItem, lang: AgentLang) {
  return t(lang, {
    en: `${item.name} is ${formatRs(item.price)}. How many would you like?`,
    ur: `${item.name} ${formatRs(item.price)} ہے۔ کتنی پیسز چاہیے؟`,
    ru: `${item.name} ${formatRs(item.price)} hai. Kitni quantity chahiye?`,
  });
}

function added(item: MenuItem, qty: number, lines: CartLine[], lang: AgentLang) {
  return t(lang, {
    en: `Added ${qty}× ${item.name}.\n${summary(lines, lang)}\nAnything else, or shall I take your details?`,
    ur: `${qty}× ${item.name} شامل ہو گیا۔\n${summary(lines, lang)}\nکچھ اور چاہیے، یا تفصیلات لے لوں؟`,
    ru: `${qty}× ${item.name} add ho gaya.\n${summary(lines, lang)}\nKuch aur chahiye, ya details le loon?`,
  });
}

function nextDetail(state: AgentState): { state: AgentState; message: string } {
  if (!state.customer.name.trim()) {
    return {
      state: { ...state, step: "name" },
      message: t(state.lang, {
        en: "Your name, please?",
        ur: "آپ کا نام؟",
        ru: "Aap ka naam?",
      }),
    };
  }
  if (!state.customer.phone.trim()) {
    return {
      state: { ...state, step: "phone" },
      message: t(state.lang, {
        en: "Your phone number?",
        ur: "فون نمبر؟",
        ru: "Phone number?",
      }),
    };
  }
  if (!state.customer.address.trim()) {
    return {
      state: { ...state, step: "address" },
      message: t(state.lang, {
        en: "Delivery address?",
        ur: "ڈیلیوری ایڈریس؟",
        ru: "Delivery address?",
      }),
    };
  }
  const recap = `${summary(state.lines, state.lang)}\nName: ${state.customer.name}\nPhone: ${state.customer.phone}\nAddress: ${state.customer.address}`;
  return {
    state: { ...state, step: "confirm" },
    message: t(state.lang, {
      en: `${recap}\n\nPlease confirm this order. Reply Yes to confirm.`,
      ur: `${recap}\n\nبراہِ کرم آرڈر کنفرم کریں۔ ہاں لکھیں۔`,
      ru: `${recap}\n\nPlease confirm karein. Haan likhein.`,
    }),
  };
}

export function agentReply(
  state: AgentState,
  raw: string,
): { state: AgentState; messages: string[]; sendWhatsApp?: boolean } {
  const text = raw.trim();
  if (!text) return { state, messages: [] };
  const lang = detectLang(text);
  let s: AgentState = { ...state, lang };

  if (s.step === "qty" && s.pendingId) {
    const qty = parseQty(text) ?? (isYes(text) ? 1 : null);
    const item = MENU.find((m) => m.id === s.pendingId);
    if (item && qty) {
      const lines = addLine(s.lines, item.id, qty);
      s = { ...s, lines, pendingId: null, step: "chat" };
      return { state: s, messages: [added(item, qty, lines, lang)] };
    }
    return {
      state: s,
      messages: [
        t(lang, {
          en: "Please send a number, like 1 or 2.",
          ur: "براہِ کرم تعداد بھیجیں، جیسے 1 یا 2۔",
          ru: "Please quantity bhejein, jaise 1 ya 2.",
        }),
      ],
    };
  }

  if (s.step === "name") {
    s = { ...s, customer: { ...s.customer, name: text } };
    const next = nextDetail(s);
    return { state: next.state, messages: [next.message] };
  }
  if (s.step === "phone") {
    s = { ...s, customer: { ...s.customer, phone: text } };
    const next = nextDetail(s);
    return { state: next.state, messages: [next.message] };
  }
  if (s.step === "address") {
    s = { ...s, customer: { ...s.customer, address: text } };
    const next = nextDetail(s);
    return { state: next.state, messages: [next.message] };
  }
  if (s.step === "confirm") {
    if (isYes(text)) {
      s = { ...s, step: "chat" };
      return {
        state: s,
        sendWhatsApp: true,
        messages: [
          t(lang, {
            en: "Order confirmed. Opening WhatsApp with the ticket for Chuski Dera.",
            ur: "آرڈر کنفرم ہو گیا۔ WhatsApp کھل رہا ہے۔",
            ru: "Order confirm ho gaya. WhatsApp khul raha hai.",
          }),
        ],
      };
    }
    if (isNo(text) || wantsRemove(text)) {
      s = { ...s, step: "chat" };
      return {
        state: s,
        messages: [
          t(lang, {
            en: "No problem. Tell me what to add, remove, or change.",
            ur: "ٹھیک ہے۔ بتائیں کیا بدلنا ہے؟",
            ru: "Theek hai. Bataein kya change karna hai?",
          }),
        ],
      };
    }
  }

  if (wantsHours(text) || /\b(calories|owner|recipe|secret)\b/i.test(text)) {
    return { state: s, messages: [UNKNOWN[lang]] };
  }

  if (/\b(where|address|location|kahan|پتہ)\b/i.test(text)) {
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${RESTAURANT.address}. Home delivery: ${RESTAURANT.phoneDisplay}.`,
          ur: `${RESTAURANT.address}۔ ہوم ڈیلیوری: ${RESTAURANT.phoneDisplay}۔`,
          ru: `${RESTAURANT.address}. Home delivery: ${RESTAURANT.phoneDisplay}.`,
        }),
      ],
    };
  }

  const items = findMenuItems(text);
  const cat = findCategory(text);
  const qty = parseQty(text);

  if (items.length > 1 && !items[0].name.toLowerCase().includes("zinger cheese")) {
    const unique = items.slice(0, 4);
    if (unique.length > 1 && unique[0].name !== unique[1].name) {
      const names = unique.map((i) => itemLine(i)).join("\n");
      return {
        state: s,
        messages: [
          t(lang, {
            en: `Which one?\n${names}`,
            ur: `کون سا والا؟\n${names}`,
            ru: `Konsa wala?\n${names}`,
          }),
        ],
      };
    }
  }

  if (items.length >= 1 && wantsRemove(text)) {
    const id = items[0].id;
    const lines = s.lines.filter((l) => l.id !== id);
    s = { ...s, lines };
    return { state: s, messages: [summary(lines, lang)] };
  }

  if (items.length >= 1 && (wantsOrder(text) || qty)) {
    const item = items[0];
    const q = qty ?? 1;
    if (!qty && !/\b(1|ek|aik|one)\b/i.test(text) && !wantsOrder(text)) {
      s = { ...s, pendingId: item.id, step: "qty" };
      return { state: s, messages: [askQty(item, lang)] };
    }
    if (!qty && wantsOrder(text)) {
      s = { ...s, pendingId: item.id, step: "qty" };
      return { state: s, messages: [askQty(item, lang)] };
    }
    const lines = addLine(s.lines, item.id, q);
    s = { ...s, lines, pendingId: null, step: "chat" };
    return { state: s, messages: [added(item, q, lines, lang)] };
  }

  if (items.length === 1 && wantsPrice(text)) {
    const item = items[0];
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${item.name} is ${formatRs(item.price)}. ${item.blurb}`,
          ur: `${item.name} ${formatRs(item.price)} ہے۔ ${item.blurb}`,
          ru: `${item.name} ${formatRs(item.price)} hai. ${item.blurb}`,
        }),
      ],
    };
  }

  if (items.length === 1) {
    const item = items[0];
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${item.name} — ${formatRs(item.price)}. ${item.blurb} Category: ${categoryLabel(item.category)}. Want to add it?`,
          ur: `${item.name} — ${formatRs(item.price)}۔ ${item.blurb} کیٹیگری: ${categoryLabel(item.category)}۔ شامل کروں؟`,
          ru: `${item.name} — ${formatRs(item.price)}. ${item.blurb} Category: ${categoryLabel(item.category)}. Add karoon?`,
        }),
      ],
    };
  }

  if (cat && (wantsMenu(text) || wantsPrice(text) || true) && /\b(burger|shawarma|wrap|fries|juice|shake|smoothie|coffee|frappe|tea|soda|menu)\b/i.test(text)) {
    const list = MENU.filter((m) => m.category === cat)
      .map((m) => itemLine(m))
      .join("\n");
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${categoryLabel(cat)}:\n${list}`,
          ur: `${categoryLabel(cat)}:\n${list}`,
          ru: `${categoryLabel(cat)}:\n${list}`,
        }),
      ],
    };
  }

  if (wantsMenu(text)) {
    const cats = CATEGORIES.filter((c) => c.id !== "all")
      .map((c) => c.label)
      .join(", ");
    return {
      state: s,
      messages: [
        t(lang, {
          en: `We have ${cats}. Which category should I show?`,
          ur: `ہمارے پاس ${cats} ہیں۔ کون سی کیٹیگری دیکھیں؟`,
          ru: `Hamare paas ${cats} hain. Konsi category dikhaoon?`,
        }),
      ],
    };
  }

  if ((wantsOrder(text) || isYes(text)) && s.lines.length) {
    const next = nextDetail(s);
    return { state: next.state, messages: [next.message] };
  }

  if (s.lines.length && /\b(total|bill|kitna hogaya|subtotal)\b/i.test(text)) {
    return { state: s, messages: [summary(s.lines, lang)] };
  }

  if (/\b(hi|hello|salam|assalam|hey)\b/i.test(text)) {
    return { state: s, messages: [greet(lang)] };
  }

  return {
    state: s,
    messages: [
      t(lang, {
        en: `I can share menu prices, item details, or take an order from the Chuski Dera menu only. What do you need?`,
        ur: `میں صرف چسکی ڈیرہ کے مینو سے قیمت، تفصیل یا آرڈر میں مدد کر سکتی ہوں۔ آپ کیا پوچھنا چاہتے ہیں؟`,
        ru: `Main sirf Chuski Dera ke menu se price, details ya order mein help kar sakti hoon. Aap kya poochna chahte hain?`,
      }),
    ],
  };
}

export function isOrderConfirmed(result: { sendWhatsApp?: boolean }) {
  return Boolean(result.sendWhatsApp);
}
