import { createHmac, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const COOKIE = "chuski_admin";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
  if (Date.now() - Number(ts) > MAX_AGE_MS) return false;
  const expected = sign(ts, secret);
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Server-only: true when admin cookie is valid. */
export function isAdminAuthenticated(): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  return verifyToken(getCookie(COOKIE), secret);
}

export function assertAdmin() {
  if (!isAdminAuthenticated()) {
    throw new Error("Unauthorized — admin login required");
  }
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const configured = Boolean(adminSecret());
  return { authenticated: isAdminAuthenticated(), configured };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const secret = adminSecret();
    if (!secret) {
      throw new Error("ADMIN_PASSWORD Vercel env mein set nahi hai");
    }
    const a = Buffer.from(data.password);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Galat password");
    }
    setCookie(COOKIE, makeToken(secret), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(MAX_AGE_MS / 1000),
    });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true };
});
