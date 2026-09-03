import { CATEGORIES, MENU, RESTAURANT, categoryLabel, findItem, formatRs, type CategoryId, type MenuItem } from "./menu";
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
    en: `Hi, welcome to ${RESTAURANT.name}. I can help with the menu or take your order. What would you like?`,
    ur: `السلام علیکم، ${RESTAURANT.name} میں خوش آمدید۔ مینو یا آرڈر میں مدد کر سکتی ہوں۔ آپ کیا لینا چاہیں گے؟`,
    ru: `Assalamualaikum, ${RESTAURANT.name} mein khush amdeed. Menu ya order mein help kar sakti hoon. Aap kya lena chahenge?`,
    pa: `Sat sri akaal, ${RESTAURANT.name} vich ji aayan nu. Menu ya order vich madad kar sakdi aan. Tusi ki lena chahunde o?`,
    hi: `Namaste, ${RESTAURANT.name} mein aapka swagat hai. Menu ya order mein madad kar sakti hoon. Aap kya lena chahenge?`,
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
  if (/^(haan ji|ji haan|haan|han|yes|confirm|yes confirm)(?:\s+(please|karo|confirm|haan|han|yes))?$/i.test(n)) {
    return "confirm";
  }
  return "unclear";
}

function listCat(id: CategoryId) {
  return MENU.filter((item) => item.category === id)
    .map((item) => `${item.name} ${formatRs(item.price)}`)
    .join(", ");
}

function findMenuItems(text: string): MenuItem[] {
  const n = nlpClean(text);
  if (!n) return [];
  const aliases: [RegExp, string][] = [
    [/mango shake|mango milkshake/, "mango-shake"],
    [/oreo shake|oreo/, "oreo-shake"],
    [/iced coffee|ice coffee|iced latte/, "iced-latte"],
    [/iced cappuccino/, "iced-cappuccino"],
    [/iced mocha/, "iced-mocha"],
    [/zinger cheese/, "zinger-cheese"],
    [/zinger burger|\bzinger\b/, "zinger"],
    [/mint margaretta|mint margarita/, "mint-margaretta"],
    [/fresh lime|lime juice/, "fresh-lime"],
  ];
  for (const [re, id] of aliases) {
    if (re.test(n)) {
      const hit = findItem(id);
      if (hit) return [hit];
    }
  }
  const exact = MENU.filter((item) => n.includes(nlpClean(item.name)));
  if (exact.length) return exact.slice(0, 1);
  if (/\bnuggets\b/.test(n) && !/shawarma/.test(n)) return MENU.filter((item) => item.id === "nuggets-5").slice(0, 1);
  if (/\bshawarma\b/.test(n) && !/zinger|nuggets|platter/.test(n)) {
    return MENU.filter((item) => item.id === "chicken-shawarma-s").slice(0, 1);
  }
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

function confirmPrompt(s: AgentState, lang: AgentLang) {
  return `${summary(s.lines, lang)}\nName: ${s.customer.name}\nPhone: ${s.customer.phone}\nDeliver to: ${s.customer.address}\n${t(lang, {
    en: "Please confirm your order. Say yes or confirm.",
    ur: "براہِ کرم آرڈر کنفرم کریں۔ ہاں یا confirm کہیں۔",
    ru: "Please confirm your order. Haan ya confirm boliye.",
    pa: "Please confirm your order. Haan ya confirm ako.",
    hi: "Please confirm your order. Haan ya confirm boliye.",
  })}`;
}

function addItem(s: AgentState, item: MenuItem, qty: number): AgentState {
  const found = s.lines.find((l) => l.id === item.id);
  const lines = found
    ? s.lines.map((l) => (l.id === item.id ? { ...l, qty: l.qty + qty } : l))
    : [...s.lines, { id: item.id, qty }];
  return { ...s, lines };
}

function catalogAnswer(text: string, lang: AgentLang): string | null {
  const n = nlpClean(text);
  if (/italian soda|soda flavor|soda ke flavor/.test(n)) {
    return t(lang, {
      en: `Italian soda flavors: ${listCat("soda")}.`,
      ur: `اٹالین سوڈا فلیور: ${listCat("soda")}۔`,
      ru: `Italian soda flavors: ${listCat("soda")}.`,
      pa: `Italian soda flavors: ${listCat("soda")}.`,
      hi: `Italian soda flavors: ${listCat("soda")}.`,
    });
  }
  if (/fresh juice|juice mein kya|juices/.test(n)) {
    return t(lang, {
      en: `Fresh juices: ${listCat("juice")}.`,
      ur: `فریش جوس: ${listCat("juice")}۔`,
      ru: `Fresh juices: ${listCat("juice")}.`,
      pa: `Fresh juices: ${listCat("juice")}.`,
      hi: `Fresh juices: ${listCat("juice")}.`,
    });
  }
  if (/special shake/.test(n)) {
    return t(lang, {
      en: `Special shakes: ${listCat("special-shakes")}.`,
      ur: `سپیشل شیکس: ${listCat("special-shakes")}۔`,
      ru: `Special shakes: ${listCat("special-shakes")}.`,
      pa: `Special shakes: ${listCat("special-shakes")}.`,
      hi: `Special shakes: ${listCat("special-shakes")}.`,
    });
  }
  if (/kya kya shake|shakes hain|shake available|simple shake/.test(n)) {
    return t(lang, {
      en: `Simple shakes: ${listCat("simple-shakes")}. Special shakes: ${listCat("special-shakes")}.`,
      ur: `سادہ شیکس: ${listCat("simple-shakes")}۔ سپیشل: ${listCat("special-shakes")}۔`,
      ru: `Simple shakes: ${listCat("simple-shakes")}. Special shakes: ${listCat("special-shakes")}.`,
      pa: `Simple shakes: ${listCat("simple-shakes")}. Special shakes: ${listCat("special-shakes")}.`,
      hi: `Simple shakes: ${listCat("simple-shakes")}. Special shakes: ${listCat("special-shakes")}.`,
    });
  }
  if (/iced coffee|ice coffee|coffee/.test(n) && /kitn|price|keemat|available|kya/.test(n)) {
    return t(lang, {
      en: `Coffee over ice: ${listCat("coffee")}.`,
      ur: `آئیس کافی: ${listCat("coffee")}۔`,
      ru: `Iced coffee: ${listCat("coffee")}.`,
      pa: `Iced coffee: ${listCat("coffee")}.`,
      hi: `Iced coffee: ${listCat("coffee")}.`,
    });
  }
  if (/refresh|thand|thanda|cooler/.test(n)) {
    const lime = findItem("fresh-lime");
    const falsa = findItem("falsa");
    const soda = findItem("lime-italian-soda");
    return t(lang, {
      en: `For something fresh: ${lime?.name} ${formatRs(lime?.price ?? 0)}, ${falsa?.name} ${formatRs(falsa?.price ?? 0)}, or ${soda?.name} ${formatRs(soda?.price ?? 0)}.`,
      ur: `تازگی کے لیے: ${lime?.name} ${formatRs(lime?.price ?? 0)}، ${falsa?.name} ${formatRs(falsa?.price ?? 0)} یا ${soda?.name} ${formatRs(soda?.price ?? 0)}۔`,
      ru: `Tazgi ke liye: ${lime?.name} ${formatRs(lime?.price ?? 0)}, ${falsa?.name} ${formatRs(falsa?.price ?? 0)}, ya ${soda?.name} ${formatRs(soda?.price ?? 0)}.`,
      pa: `Tazgi layi: ${lime?.name} ${formatRs(lime?.price ?? 0)}, ${falsa?.name} ${formatRs(falsa?.price ?? 0)}, ya ${soda?.name} ${formatRs(soda?.price ?? 0)}.`,
      hi: `Tazgi ke liye: ${lime?.name} ${formatRs(lime?.price ?? 0)}, ${falsa?.name} ${formatRs(falsa?.price ?? 0)}, ya ${soda?.name} ${formatRs(soda?.price ?? 0)}.`,
    });
  }
  if (/creamy|thick shake|best shake|sab se acha shake|popular shake/.test(n)) {
    const mango = findItem("mango-shake");
    const oreo = findItem("oreo-shake");
    const pb = findItem("chocolate-pb-shake");
    return t(lang, {
      en: `Creamy picks from our menu: ${mango?.name} ${formatRs(mango?.price ?? 0)}, ${oreo?.name} ${formatRs(oreo?.price ?? 0)}, ${pb?.name} ${formatRs(pb?.price ?? 0)}.`,
      ur: `کریمی شیکس: ${mango?.name} ${formatRs(mango?.price ?? 0)}، ${oreo?.name} ${formatRs(oreo?.price ?? 0)}، ${pb?.name} ${formatRs(pb?.price ?? 0)}۔`,
      ru: `Creamy shakes: ${mango?.name} ${formatRs(mango?.price ?? 0)}, ${oreo?.name} ${formatRs(oreo?.price ?? 0)}, ${pb?.name} ${formatRs(pb?.price ?? 0)}.`,
      pa: `Creamy shakes: ${mango?.name} ${formatRs(mango?.price ?? 0)}, ${oreo?.name} ${formatRs(oreo?.price ?? 0)}, ${pb?.name} ${formatRs(pb?.price ?? 0)}.`,
      hi: `Creamy shakes: ${mango?.name} ${formatRs(mango?.price ?? 0)}, ${oreo?.name} ${formatRs(oreo?.price ?? 0)}, ${pb?.name} ${formatRs(pb?.price ?? 0)}.`,
    });
  }
  if (/pizza|biryani|plain ice cream|icecream cup/.test(n)) {
    return t(lang, {
      en: "That item is not on the Chuski Dera menu. I can help with burgers, shawarma, shakes, juices, or deals.",
      ur: "یہ چیز چسکی ڈیرہ کے مینو پر نہیں ہے۔ برگر، شاورما، شیک یا ڈیل بتا سکتی ہوں۔",
      ru: "Ye item Chuski Dera ke menu par nahi hai. Burger, shawarma, shake ya deal bata sakti hoon.",
      pa: "Eh item Chuski Dera de menu te nahi. Burger, shawarma, shake ya deal dass sakdi aan.",
      hi: "Yeh item Chuski Dera ke menu par nahi hai. Burger, shawarma, shake ya deal bata sakti hoon.",
    });
  }
  return null;
}

export function agentReply(
  state: AgentState,
  raw: string,
): { state: AgentState; messages: string[]; sendWhatsApp?: boolean } {
  const text = raw.trim();
  if (!text) return { state, messages: [] };
  const lang = detectLang(text);
  let s: AgentState = { ...state, lang, customer: { ...state.customer }, lines: [...state.lines] };

  if (s.pendingId && /\b(5|10|small|large|bada|chota|five|ten)\b/i.test(text)) {
    const pending = findItem(s.pendingId);
    if (pending) {
      let item = pending;
      if (/\b(10|ten)\b/i.test(text) && pending.id.startsWith("nuggets")) item = findItem("nuggets-10") ?? pending;
      if (/\b(5|five)\b/i.test(text) && pending.id.startsWith("nuggets")) item = findItem("nuggets-5") ?? pending;
      if (/\b(large|bada)\b/i.test(text) && pending.id.includes("shawarma")) item = findItem("chicken-shawarma-l") ?? pending;
      if (/\b(small|chota)\b/i.test(text) && pending.id.includes("shawarma")) item = findItem("chicken-shawarma-s") ?? pending;
      s.pendingId = null;
      s = addItem(s, item, 1);
      return {
        state: s,
        messages: [
          t(lang, {
            en: `Added ${item.name}.\n${summary(s.lines, lang)} Anything else?`,
            ur: `${item.name} شامل ہو گیا۔\n${summary(s.lines, lang)} اور کچھ چاہیے؟`,
            ru: `${item.name} add ho gaya.\n${summary(s.lines, lang)} Aur kuch chahiye?`,
            pa: `${item.name} add ho gaya.\n${summary(s.lines, lang)} Hor kuj chahida?`,
            hi: `${item.name} add ho gaya.\n${summary(s.lines, lang)} Aur kuch chahiye?`,
          }),
        ],
      };
    }
  }

  if (s.step === "chat" && !s.pendingId && nlpIntent(text) === "unclear") {
    return {
      state: s,
      messages: [
        t(lang, {
          en: "Sorry, I missed that. Please say the item name, like mango shake or zinger burger.",
          ur: "معاف کریں، سمجھ نہیں آئی۔ آئٹم کا نام بولیں، جیسے مینگو شیک یا زنگر برگر۔",
          ru: "Maaf kijiye, samajh nahi aayi. Item ka naam boliye, jaise mango shake ya zinger burger.",
          pa: "Maaf karo, samajh nahi aayi. Item da naam daso, jiven mango shake ya zinger burger.",
          hi: "Maaf kijiye, samajh nahi aayi. Item ka naam boliye, jaise mango shake ya zinger burger.",
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
    return { state: s, messages: [confirmPrompt(s, lang)] };
  }

  if (s.step === "confirm") {
    const decision = confirmationDecision(text);
    if (decision === "reject") {
      s.step = "chat";
      return {
        state: s,
        messages: [
          t(lang, {
            en: "Okay, the order is not confirmed. Can I help with anything else?",
            ur: "ٹھیک ہے، آرڈر کنفرم نہیں ہوا۔ کچ اور مدد چاہیے؟",
            ru: "Theek hai, order confirm nahi hua. Kuch aur chahiye?",
            pa: "Theek ae, order confirm nahi hoia. Hor kuj chahida?",
            hi: "Theek hai, order confirm nahi hua. Kuch aur chahiye?",
          }),
        ],
      };
    }
    if (decision === "confirm") {
      s.step = "chat";
      return {
        state: s,
        messages: [
          t(lang, {
            en: `Your order is confirmed. Thank you for ordering from ${RESTAURANT.name}.`,
            ur: `آپ کا آرڈر کنفرم ہو گیا۔ ${RESTAURANT.name} سے آرڈر کرنے کا شکریہ۔`,
            ru: `Aap ka order confirm ho gaya. ${RESTAURANT.name} se order karne ka shukriya.`,
            pa: `Tuhada order confirm ho gaya. ${RESTAURANT.name} ton order da shukriya.`,
            hi: `Aapka order confirm ho gaya. ${RESTAURANT.name} se order karne ka dhanyavad.`,
          }),
        ],
        sendWhatsApp: true,
      };
    }
    return {
      state: s,
      messages: [
        t(lang, {
          en: "Please confirm your order. Say yes or confirm.",
          ur: "براہِ کرم آرڈر کنفرم کریں۔ ہاں یا confirm کہیں۔",
          ru: "Please confirm your order. Haan ya confirm boliye.",
          pa: "Please confirm your order. Haan ya confirm ako.",
          hi: "Please confirm your order. Haan ya confirm boliye.",
        }),
      ],
    };
  }

  if (/\b(bas|checkout|confirm|order karo|place order|bill)\b/i.test(text)) {
    if (!s.lines.length) {
      return {
        state: s,
        messages: [
          t(lang, {
            en: "Your cart is empty. Tell me an item first, like Mango Shake or Zinger Burger.",
            ur: "کارٹ خالی ہے۔ پہلے آئٹم بتائیں، جیسے مینگو شیک یا زنگر برگر۔",
            ru: "Cart khali hai. Pehle item bataiye, jaise Mango Shake ya Zinger Burger.",
            pa: "Cart khali ae. Pehlan item dasso, jiven Mango Shake ya Zinger Burger.",
            hi: "Cart khali hai. Pehle item bataiye, jaise Mango Shake ya Zinger Burger.",
          }),
        ],
      };
    }
    if (!s.customer.name.trim()) {
      s.step = "name";
      return { state: s, messages: [t(lang, { en: "Please tell me your name.", ur: "براہِ کرم اپنا نام بتائیں۔", ru: "Apna naam bataiye.", pa: "Apna naam dasso.", hi: "Apna naam bataiye." })] };
    }
    s.step = "confirm";
    return { state: s, messages: [confirmPrompt(s, lang)] };
  }

  if (/\bnuggets\b/i.test(text) && !/\b(5|10)\b/.test(text) && !/shawarma/.test(text)) {
    s.pendingId = "nuggets-5";
    return { state: s, messages: [t(lang, { en: "Nuggets 5 pieces or 10 pieces?", ur: "نگٹس 5 پیس یا 10 پیس؟", ru: "Nuggets 5 pieces ya 10 pieces?", pa: "Nuggets 5 pieces ya 10 pieces?", hi: "Nuggets 5 pieces ya 10 pieces?" })] };
  }
  if (/\bshawarma\b/i.test(text) && !/\b(small|large|zinger|nuggets|platter)\b/i.test(text)) {
    s.pendingId = "chicken-shawarma-s";
    return { state: s, messages: [t(lang, { en: "Small Chicken Shawarma or Large?", ur: "سمال چکن شاورما یا لارج؟", ru: "Small Chicken Shawarma ya Large?", pa: "Small Chicken Shawarma ya Large?", hi: "Small Chicken Shawarma ya Large?" })] };
  }

  const catalog = catalogAnswer(text, lang);
  if (catalog) return { state: s, messages: [catalog] };

  const items = findMenuItems(text);
  const qty = nlpQty(text) ?? 1;
  if (items[0] && /\b(chahiye|add|order|lena|want|do)\b/i.test(text)) {
    s = addItem(s, items[0], qty);
    return {
      state: s,
      messages: [
        t(lang, {
          en: `Added ${qty}x ${items[0].name}.\n${summary(s.lines, lang)} Anything else?`,
          ur: `${qty}x ${items[0].name} شامل ہو گیا۔\n${summary(s.lines, lang)} اور کچھ چاہیے؟`,
          ru: `${qty}x ${items[0].name} add ho gaya.\n${summary(s.lines, lang)} Aur kuch chahiye?`,
          pa: `${qty}x ${items[0].name} add ho gaya.\n${summary(s.lines, lang)} Hor kuj chahida?`,
          hi: `${qty}x ${items[0].name} add ho gaya.\n${summary(s.lines, lang)} Aur kuch chahiye?`,
        }),
      ],
    };
  }
  if (items[0]) {
    return {
      state: s,
      messages: [
        t(lang, {
          en: `${items[0].name} is ${formatRs(items[0].price)}. Shall I add it?`,
          ur: `${items[0].name} ${formatRs(items[0].price)} ہے۔ شامل کروں؟`,
          ru: `${items[0].name} ${formatRs(items[0].price)} hai. Add karun?`,
          pa: `${items[0].name} ${formatRs(items[0].price)} ae. Add karan?`,
          hi: `${items[0].name} ${formatRs(items[0].price)} hai. Add karun?`,
        }),
      ],
    };
  }

  if (/\b(menu|items|kya kya hai)\b/i.test(text)) {
    const cats = CATEGORIES.filter((c) => c.id !== "all").map((c) => c.label).join(", ");
    return {
      state: s,
      messages: [
        t(lang, {
          en: `We have ${cats}. Which one should I open?`,
          ur: `ہمارے پاس ${cats} ہیں۔ کون سی کیٹیگری چاہیے؟`,
          ru: `Hamare paas ${cats} hain. Kaunsi category chahiye?`,
          pa: `Saade kol ${cats} ne. Kehri category chahidi?`,
          hi: `Hamare paas ${cats} hain. Kaunsi category chahiye?`,
        }),
      ],
    };
  }

  return {
    state: s,
    messages: [
      t(lang, {
        en: "I can share real menu prices or take your order. What would you like?",
        ur: "میں اصلی مینو کی قیمت بتا سکتی ہوں، یا آرڈر لے سکتی ہوں۔ آپ کیا چاہیں گے؟",
        ru: "Main asli menu ki price bata sakti hoon, ya order le sakti hoon. Aap kya chahenge?",
        pa: "Main asli menu di price dass sakdi aan, ya order le sakdi aan. Tusi ki chahunde o?",
        hi: "Main asli menu ki keemat bata sakti hoon, ya order le sakti hoon. Aap kya chahenge?",
      }),
    ],
  };
}

export function isOrderConfirmed(result: { sendWhatsApp?: boolean }) {
  return Boolean(result.sendWhatsApp);
}

export { categoryLabel };
