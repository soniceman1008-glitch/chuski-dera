import { getSql } from "@/lib/db";

export type CallLang = "ur" | "en";
export type CallStep = "intent" | "items" | "name" | "phone" | "address" | "notes" | "confirm" | "done";

export type CartLine = { id: string; name: string; price: number; qty: number };

export type CallState = {
  id: string;
  fromNumber: string;
  toNumber: string;
  lang: CallLang;
  step: CallStep;
  status: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  cart: CartLine[];
  orderId: number | null;
};

type MenuRow = { id: string; name: string; price: number; available: boolean };

const GREET_UR =
  "Assalam-o-Alaikum, Chuski Dera mein khush amdeed. Main aap ka AI assistant hoon. Aap order dena chahte hain ya menu ke bare mein maloomat chahte hain?";
const GREET_EN =
  "Assalam-o-Alaikum, welcome to Chuski Dera. I am your AI assistant. Would you like to place an order, or hear the menu?";

function env(name: string) {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const v = proc?.env?.[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

export function voiceAgentStatus() {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const twilioPhone = env("TWILIO_VOICE_NUMBER");
  const staff = env("STAFF_FORWARD_NUMBER") || "+923139235654";
  return {
    configured: Boolean(sid && token && twilioPhone),
    publicCallNumber: "+923139235654",
    twilioVoiceNumber: twilioPhone || null,
    staffForwardNumber: staff,
    webhookBase: env("BETTER_AUTH_URL") || "https://chuski-dera.vercel.app",
  };
}

export function staffForwardNumber() {
  return env("STAFF_FORWARD_NUMBER") || "+923139235654";
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[^؀-ۿa-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectLang(text: string): CallLang {
  const t = text.toLowerCase();
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  if (/\b(the|please|order|menu|hello|address|delivery|yes|no|want)\b/.test(t) && !/\b(haan|nahi|chahiye|order|menu|address)\b/.test(t))
    return "en";
  return "ur";
}

function wantsStaff(text: string) {
  return /\b(staff|human|manager|owner|insaan|insaaan|waiter|person|operator|transfer)\b|kisi se baat|insaan se|staff se/i.test(
    text,
  );
}

function isYes(text: string) {
  return /\b(haan|han|ha|yes|ok|okay|confirm|theek|bilkul|ji|sahi)\b/i.test(text);
}

function isNo(text: string) {
  return /\b(nahi|nahin|no|cancel|mat|galat)\b/i.test(text);
}

function qtyFrom(text: string) {
  const digits = text.match(/\b(\d{1,2})\b/);
  if (digits) return Math.min(20, Math.max(1, Number(digits[1])));
  if (/\b(do|two|2)\b/i.test(text)) return 2;
  if (/\b(teen|three|3)\b/i.test(text)) return 3;
  if (/\b(char|four|4)\b/i.test(text)) return 4;
  if (/\b(paanch|five|5)\b/i.test(text)) return 5;
  return 1;
}

function matchItems(speech: string, menu: MenuRow[]): CartLine[] {
  const t = norm(speech);
  const hits: CartLine[] = [];
  const qty = qtyFrom(speech);
  const sorted = [...menu].sort((a, b) => b.name.length - a.name.length);
  for (const item of sorted) {
    if (!item.available) continue;
    const n = norm(item.name);
    const first = n.split(" ")[0] ?? n;
    if ((n.length > 3 && t.includes(n)) || (first.length > 3 && t.includes(first))) {
      if (!hits.some((h) => h.id === item.id)) hits.push({ id: item.id, name: item.name, price: item.price, qty });
    }
  }
  return hits;
}

function cartTotal(cart: CartLine[]) {
  return cart.reduce((s, l) => s + l.price * l.qty, 0);
}

function sayCart(cart: CartLine[], lang: CallLang) {
  if (!cart.length) return lang === "en" ? "Your cart is empty." : "Aap ka cart khali hai.";
  const bits = cart.map((l) => `${l.qty} ${l.name}`);
  const total = cartTotal(cart);
  return lang === "en"
    ? `${bits.join(", ")}. Total ${total} rupees.`
    : `${bits.join(", ")}. Kul ${total} rupay.`;
}

async function loadMenu(): Promise<MenuRow[]> {
  const sql = await getSql();
  return sql<MenuRow>`select id, name, price, available from menu_items order by sort_order`;
}

async function loadHoursAddress() {
  const sql = await getSql();
  const rows = await sql<{ hours: string; address: string; city: string }>`
    select hours, address, city from settings where id = 'main'
  `;
  return rows[0] ?? { hours: "12:00 PM – 12:00 AM", address: "Satellite Town B Block, Green Belt, Jhang", city: "Jhang" };
}

export async function loadCall(id: string): Promise<CallState | null> {
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`select * from call_sessions where id = ${id}`;
  const row = rows[0];
  if (!row) return null;
  let cart: CartLine[] = [];
  try {
    cart = JSON.parse(String(row.cart_json || "[]")) as CartLine[];
  } catch {
    cart = [];
  }
  return {
    id: String(row.id),
    fromNumber: String(row.from_number ?? ""),
    toNumber: String(row.to_number ?? ""),
    lang: row.lang === "en" ? "en" : "ur",
    step: String(row.step || "intent") as CallStep,
    status: String(row.status || "in_progress"),
    name: String(row.customer_name ?? ""),
    phone: String(row.customer_phone ?? ""),
    address: String(row.address ?? ""),
    notes: String(row.notes ?? ""),
    cart,
    orderId: row.order_id != null ? Number(row.order_id) : null,
  };
}

export async function saveCall(state: CallState) {
  const sql = await getSql();
  const cart = JSON.stringify(state.cart);
  await sql`
    update call_sessions set
      lang = ${state.lang},
      step = ${state.step},
      status = ${state.status},
      customer_name = ${state.name},
      customer_phone = ${state.phone},
      address = ${state.address},
      notes = ${state.notes},
      cart_json = ${cart},
      order_id = ${state.orderId}
    where id = ${state.id}
  `;
}

export async function addTurn(callId: string, role: "user" | "agent", text: string) {
  const sql = await getSql();
  await sql`insert into call_turns (call_id, role, text) values (${callId}, ${role}, ${text})`;
}

export async function startCall(id: string, fromNumber: string, toNumber: string) {
  const sql = await getSql();
  await sql`
    insert into call_sessions (id, from_number, to_number, lang, step, status, customer_phone)
    values (${id}, ${fromNumber}, ${toNumber}, ${"ur"}, ${"intent"}, ${"in_progress"}, ${fromNumber})
    on conflict (id) do nothing
  `;
  await addTurn(id, "agent", GREET_UR);
}

export function greeting(lang: CallLang) {
  return lang === "en" ? GREET_EN : GREET_UR;
}

async function placeFromCall(state: CallState) {
  if (!state.cart.length) throw new Error("empty");
  const sql = await getSql();
  const name = state.name.trim() || "Call customer";
  const phone = (state.phone || state.fromNumber).trim();
  const address = state.address.trim();
  if (!phone || !address) throw new Error("missing");
  for (const line of state.cart) {
    const rows = await sql<{ available: boolean }>`select available from menu_items where id = ${line.id}`;
    if (!rows[0]?.available) throw new Error(line.name);
  }
  const subtotal = cartTotal(state.cart);
  const existing = await sql<{ id: number }>`select id from customers where phone = ${phone} limit 1`;
  let customerId = existing[0] ? Number(existing[0].id) : 0;
  if (!customerId) {
    const inserted = await sql<{ id: number }>`
      insert into customers (name, phone, address) values (${name}, ${phone}, ${address}) returning id
    `;
    customerId = Number(inserted[0].id);
  } else {
    await sql`update customers set name = ${name}, address = ${address} where id = ${customerId}`;
  }
  const notes = ["Voice call order", state.notes].filter(Boolean).join(" — ");
  const order = await sql<{ id: number }>`
    insert into orders (customer_id, status, subtotal, delivery, total, notes)
    values (${customerId}, ${"new"}, ${subtotal}, ${0}, ${subtotal}, ${notes})
    returning id
  `;
  const orderId = Number(order[0].id);
  for (const line of state.cart) {
    await sql`
      insert into order_items (order_id, item_id, name, price, qty)
      values (${orderId}, ${line.id}, ${line.name}, ${line.price}, ${line.qty})
    `;
  }
  return orderId;
}

export type AgentReply = { say: string; gather: boolean; transfer: boolean; hangup: boolean; lang: CallLang };

export async function handleSpeech(state: CallState, speech: string): Promise<AgentReply> {
  const text = speech.trim();
  if (text) state.lang = detectLang(text);
  const lang = state.lang;
  const menu = await loadMenu();
  const shop = await loadHoursAddress();

  if (wantsStaff(text)) {
    state.status = "transferred";
    const say =
      lang === "en"
        ? "Okay, I am transferring you to our staff now."
        : "Theek hai, main aap ko staff se mila raha hoon.";
    return { say, gather: false, transfer: true, hangup: false, lang };
  }

  const unclear =
    lang === "en"
      ? "Sorry, I did not catch that. Please say it again, slowly."
      : "Maaf kijiye, samajh nahi aaya. Zara dheere dobara boliye.";

  if (state.step === "intent") {
    if (/menu|price|rate|keemat|kya hai|items/i.test(text)) {
      const sample = menu
        .filter((m) => m.available)
        .slice(0, 6)
        .map((m) => `${m.name} ${m.price}`)
        .join(", ");
      const say =
        lang === "en"
          ? `Popular items: ${sample}. Delivery in Jhang city. Hours ${shop.hours}. We are at ${shop.address}. Would you like to order?`
          : `Popular items: ${sample}. Delivery Jhang city mein. Timing ${shop.hours}. Address ${shop.address}. Order dena chahenge?`;
      return { say, gather: true, transfer: false, hangup: false, lang };
    }
    if (/hours|time|timing|khula|band/i.test(text)) {
      const say =
        lang === "en"
          ? `We are open ${shop.hours}. Anything else, or shall I take your order?`
          : `Hamari timing ${shop.hours} hai. Aur kuch, ya order le loon?`;
      return { say, gather: true, transfer: false, hangup: false, lang };
    }
    if (/location|address|kahan|kahaan|jhang/i.test(text) && !/delivery address|mera address/i.test(text)) {
      const say =
        lang === "en"
          ? `We are at ${shop.address}. Delivery across Jhang city. Would you like to order?`
          : `Hamara address ${shop.address} hai. Delivery Jhang city mein. Order dena hai?`;
      return { say, gather: true, transfer: false, hangup: false, lang };
    }
    if (/delivery|deliver|pohncha/i.test(text)) {
      const say =
        lang === "en"
          ? "We deliver inside Jhang city. Delivery time depends on kitchen load. I will not promise an exact minute. Shall I take the order?"
          : "Delivery Jhang city ke andar hai. Time kitchen ke hisaab se hota hai, exact minute ka wada nahi. Order le loon?";
      return { say, gather: true, transfer: false, hangup: false, lang };
    }
    const items = matchItems(text, menu);
    if (items.length || /order|karo|chahiye|lena/i.test(text)) {
      if (items.length) state.cart = mergeCart(state.cart, items);
      state.step = items.length ? "name" : "items";
      const say = items.length
        ? lang === "en"
          ? `${sayCart(state.cart, lang)} Please tell me your name.`
          : `${sayCart(state.cart, lang)} Apna naam bataiye.`
        : lang === "en"
          ? "What would you like to order? Say the item name and quantity."
          : "Kya order karna hai? Item ka naam aur quantity boliye.";
      return { say, gather: true, transfer: false, hangup: false, lang };
    }
    return { say: unclear, gather: true, transfer: false, hangup: false, lang };
  }

  if (state.step === "items") {
    const items = matchItems(text, menu);
    if (!items.length) {
      return {
        say:
          lang === "en"
            ? "I could not match that to the menu. Please name an available item, like Zinger Burger."
            : "Yeh item menu se match nahi hua. Available item ka naam boliye, jaise Zinger Burger.",
        gather: true,
        transfer: false,
        hangup: false,
        lang,
      };
    }
    state.cart = mergeCart(state.cart, items);
    state.step = "name";
    const say =
      lang === "en"
        ? `${sayCart(state.cart, lang)} Please tell me your name.`
        : `${sayCart(state.cart, lang)} Apna naam bataiye.`;
    return { say, gather: true, transfer: false, hangup: false, lang };
  }

  if (state.step === "name") {
    const name = text.replace(/mera naam|my name is|naam/gi, "").trim();
    if (name.length < 2) return { say: unclear, gather: true, transfer: false, hangup: false, lang };
    state.name = name.slice(0, 80);
    state.step = "phone";
    const say =
      lang === "en"
        ? "Please say your phone number, digit by digit."
        : "Apna phone number boliye, number by number.";
    return { say, gather: true, transfer: false, hangup: false, lang };
  }

  if (state.step === "phone") {
    const digits = text.replace(/\D/g, "");
    if (digits.length < 10) {
      return {
        say: lang === "en" ? "That number is too short. Please say the full phone number." : "Number chhota hai. Poora phone number boliye.",
        gather: true,
        transfer: false,
        hangup: false,
        lang,
      };
    }
    state.phone = digits.startsWith("92") ? `+${digits}` : digits.startsWith("0") ? `+92${digits.slice(1)}` : `+92${digits}`;
    state.step = "address";
    const say =
      lang === "en"
        ? "Please say your delivery address in Jhang."
        : "Jhang mein apna delivery address boliye.";
    return { say, gather: true, transfer: false, hangup: false, lang };
  }

  if (state.step === "address") {
    if (text.length < 6) return { say: unclear, gather: true, transfer: false, hangup: false, lang };
    state.address = text.slice(0, 200);
    state.step = "notes";
    const say =
      lang === "en"
        ? "Any special instruction? Say none if nothing extra."
        : "Koi special instruction? Agar nahi to nahi boliye.";
    return { say, gather: true, transfer: false, hangup: false, lang };
  }

  if (state.step === "notes") {
    if (!isNo(text) && !/none|kuch nahi|nahi/i.test(text)) state.notes = text.slice(0, 200);
    state.step = "confirm";
    const say =
      lang === "en"
        ? `Please confirm. ${state.name}, ${state.phone}, ${state.address}. ${sayCart(state.cart, lang)} ${state.notes ? "Note: " + state.notes + "." : ""} Say yes to confirm, or no to cancel.`
        : `Confirm kijiye. ${state.name}, ${state.phone}, ${state.address}. ${sayCart(state.cart, lang)} ${state.notes ? "Note: " + state.notes + "." : ""} Haan boliye confirm ke liye, nahi cancel ke liye.`;
    return { say, gather: true, transfer: false, hangup: false, lang };
  }

  if (state.step === "confirm") {
    if (isNo(text)) {
      state.status = "cancelled";
      state.step = "done";
      const say = lang === "en" ? "Okay, the order is cancelled. Thank you for calling Chuski Dera." : "Theek hai, order cancel hai. Chuski Dera call karne ka shukriya.";
      return { say, gather: false, transfer: false, hangup: true, lang };
    }
    if (!isYes(text)) return { say: unclear, gather: true, transfer: false, hangup: false, lang };
    try {
      const id = await placeFromCall(state);
      state.orderId = id;
      state.status = "completed";
      state.step = "done";
      const say =
        lang === "en"
          ? `Order ${id} is saved. The kitchen will confirm. Payment and exact delivery time follow kitchen availability. Thank you for calling Chuski Dera.`
          : `Order ${id} save ho gaya. Kitchen confirm kare ga. Payment aur exact delivery time kitchen ke mutabiq hoga. Chuski Dera call karne ka shukriya.`;
      return { say, gather: false, transfer: false, hangup: true, lang };
    } catch {
      const say =
        lang === "en"
          ? "I could not save that order. I am transferring you to staff."
          : "Order save nahi ho saka. Main aap ko staff se mila raha hoon.";
      state.status = "transferred";
      return { say, gather: false, transfer: true, hangup: false, lang };
    }
  }

  return { say: unclear, gather: true, transfer: false, hangup: false, lang };
}

function mergeCart(current: CartLine[], add: CartLine[]) {
  const next = [...current];
  for (const line of add) {
    const i = next.findIndex((x) => x.id === line.id);
    if (i >= 0) next[i] = { ...next[i], qty: Math.min(20, next[i].qty + line.qty) };
    else next.push(line);
  }
  return next;
}
