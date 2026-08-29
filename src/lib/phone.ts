/** Canonical Chuski Dera contact. Never show or dial anything else. */
export const CALL_DISPLAY = "0313-9235654";
export const CALL_TEL = "+923139235654";
export const CALL_HREF = "tel:+923139235654";
export const WA_DISPLAY = "0313-9235654";
export const WA_TEL = "+923139235654";
export const WA_E164 = "923139235654";

const ALLOWED = new Set(["03139235654", "923139235654", "3139235654"]);

export function digitsOnly(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isCanonicalPhone(value: string) {
  return ALLOWED.has(digitsOnly(value));
}

export function normalizePkPhone(text: string): string | null {
  const d = digitsOnly(text);
  if (d.length === 11 && d.startsWith("03")) return d;
  if (d.length === 12 && d.startsWith("92")) return `0${d.slice(2)}`;
  if (d.length === 10 && d.startsWith("3")) return `0${d}`;
  return null;
}

export function sanitizeCallDisplay(_value?: string) {
  return CALL_DISPLAY;
}

export function sanitizeCallTel(_value?: string) {
  return CALL_TEL;
}

export function sanitizeWaDisplay(_value?: string) {
  return WA_DISPLAY;
}

export function sanitizeWaTel(_value?: string) {
  return WA_TEL;
}
