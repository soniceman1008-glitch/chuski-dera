/**
 * Cafe mode: auth is OFF. Stub only — no pg Pool, no better-auth import.
 * This stops DATABASE_URL from taking the whole site down with 500s.
 */
import { getCookie } from "@tanstack/react-start/server";
import { GROK_PROVIDERS } from "./providers";

export const authConfigured = false;

export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

export const auth = {
  handler: async (_request: Request) =>
    new Response(JSON.stringify({ user: null, session: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  api: {
    getSession: async () => null,
  },
};

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { GROK_PROVIDERS };
