import { createHmac } from "node:crypto";
import { getCookie, getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { rateLimit } from "./rate-limit";

const COOKIE = "chuski_admin";
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function adminSecret(): string | undefined {
  const v = process.env.ADMIN_PASSWORD?.trim() || process.env.BETTER_AUTH_SECRET?.trim();
  return v || undefined;
}

function sign(ts: string, secret: string) {
  return createHmac("sha256", secret).update(`chuski-admin:${ts}`).digest("hex");
}

function makeToken(secret: string) {
  const ts = String(Date.now());
  return `${ts}.${sign(ts, secret)}`;
}

function verifyToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return false;
  if (Date.now() - Number(ts) > MAX_AGE_SEC * 1000) return false;
  const expected = sign(ts, secret);
  if (sig.length !== expected.length) return false;
  let ok = true;
  for (let i = 0; i < sig.length; i += 1) {
    if (sig.charCodeAt(i) !== expected.charCodeAt(i)) ok = false;
  }
  return ok;
}

function readCookie(): string | undefined {
  try {
    return getCookie(COOKIE);
  } catch {
    const header = getRequestHeader("cookie") ?? "";
    for (const part of header.split(/;\s*/)) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      if (part.slice(0, eq) === COOKIE) return part.slice(eq + 1);
    }
    return undefined;
  }
}

function clientIp(): string {
  const xff = getRequestHeader("x-forwarded-for") ?? "";
  return (xff.split(",")[0]?.trim() || getRequestHeader("x-real-ip") || "unknown").slice(0, 64);
}

export function isAdminConfigured() {
  return Boolean(adminSecret());
}

export function isAdminAuthenticated() {
  const secret = adminSecret();
  if (!secret) return false;
  return verifyToken(readCookie(), secret);
}

export function assertAdmin() {
  if (!isAdminAuthenticated()) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export function loginWithPassword(password: string) {
  const limited = rateLimit(`admin-login:${clientIp()}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    throw new Error("Bohot tries. Thori dair baad try karo.");
  }
  const secret = adminSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD Vercel env mein set nahi hai");
  if (password !== secret) throw new Error("Galat password");
  const token = makeToken(secret);
  setResponseHeader(
    "Set-Cookie",
    [`${COOKIE}=${token}`, "HttpOnly", "Secure", "SameSite=Lax", "Path=/", `Max-Age=${MAX_AGE_SEC}`].join("; "),
  );
}

export function logoutAdmin() {
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
}
