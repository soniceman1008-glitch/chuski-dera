import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const COOKIE = "chuski_admin";
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function adminSecret(): string | undefined {
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const v = env?.ADMIN_PASSWORD?.trim() || env?.BETTER_AUTH_SECRET?.trim();
    return v || undefined;
  } catch {
    return undefined;
  }
}

async function sign(ts: string, secret: string) {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(`chuski-admin:${ts}`).digest("hex");
}

async function makeToken(secret: string) {
  const ts = String(Date.now());
  return `${ts}.${await sign(ts, secret)}`;
}

async function verifyToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return false;
  if (Date.now() - Number(ts) > MAX_AGE_SEC * 1000) return false;
  const expected = await sign(ts, secret);
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

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = adminSecret();
  if (!secret) return false;
  return verifyToken(readCookie(), secret);
}

export async function assertAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Unauthorized — admin login required");
  }
}

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const configured = Boolean(adminSecret());
  return { authenticated: await isAdminAuthenticated(), configured };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const secret = adminSecret();
    if (!secret) {
      throw new Error("ADMIN_PASSWORD Vercel env mein set nahi hai");
    }
    if (data.password !== secret) {
      throw new Error("Galat password");
    }
    const token = await makeToken(secret);
    setResponseHeader(
      "Set-Cookie",
      [
        `${COOKIE}=${token}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${MAX_AGE_SEC}`,
      ].join("; "),
    );
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader(
    "Set-Cookie",
    `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
  return { ok: true };
});
