import { findItem, formatRs, RESTAURANT } from "./menu";
import type { CartLine, Customer } from "./cart-store";
import { cartTotal } from "./cart-store";

const WA_NUMBER = RESTAURANT.phoneTel.replace("+", "");
const TZ = "Asia/Karachi";

function stamp(now = new Date()) {
  const date = now.toLocaleDateString("en-PK", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("en-PK", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  return { date, time };
}

export function buildOrderMessage(lines: CartLine[], customer: Customer, now = new Date()) {
  const { date, time } = stamp(now);
  const subtotal = cartTotal(lines);
  const delivery = 0;
  const grand = subtotal + delivery;
  const rows: string[] = [];

  rows.push(`*${RESTAURANT.name} — New Order*`);
  rows.push("");
  if (customer.name.trim()) rows.push(`Name: ${customer.name.trim()}`);
  if (customer.phone.trim()) rows.push(`Phone: ${customer.phone.trim()}`);
  if (customer.address.trim()) rows.push(`Address: ${customer.address.trim()}`);
  rows.push(`Date: ${date}`);
  rows.push(`Time: ${time}`);
  rows.push("");
  rows.push("*Items*");
  for (const line of lines) {
    const item = findItem(line.id);
    if (!item) continue;
    const lineTotal = item.price * line.qty;
    rows.push(
      `${line.qty}× ${item.name} — ${formatRs(item.price)} each — ${formatRs(lineTotal)}`,
    );
  }
  rows.push("");
  rows.push(`Subtotal: ${formatRs(subtotal)}`);
  rows.push(`Delivery: ${delivery > 0 ? formatRs(delivery) : "Free"}`);
  rows.push(`*Grand total: ${formatRs(grand)}*`);
  rows.push("");
  rows.push("Please confirm. Thank you!");
  return rows.join("\n");
}

export function whatsappOrderHref(lines: CartLine[], customer: Customer, now = new Date()) {
  const url = new URL(`https://wa.me/${WA_NUMBER}`);
  url.searchParams.set("text", buildOrderMessage(lines, customer, now));
  return url.toString();
}

export function whatsappBlankHref() {
  const url = new URL(`https://wa.me/${WA_NUMBER}`);
  url.searchParams.set("text", `Hi ${RESTAURANT.name}, I'd like to order.`);
  return url.toString();
}
