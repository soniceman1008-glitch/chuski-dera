import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Client-safe RPC wrappers — real logic lives in admin-session.server.ts */

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const mod = await import("./admin-session.server");
  return {
    authenticated: mod.isAdminAuthenticated(),
    configured: mod.isAdminConfigured(),
  };
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const mod = await import("./admin-session.server");
    mod.loginWithPassword(data.password);
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const mod = await import("./admin-session.server");
  mod.logoutAdmin();
  return { ok: true };
});

export async function assertAdmin() {
  const mod = await import("./admin-session.server");
  mod.assertAdmin();
}
