# Phone number lock (2026-08-21)

Canonical numbers (do not change):

- Display: `0313-9235654`
- Tel / WhatsApp: `+923139235654`

Forbidden (typos found in old builds):

- `+923139235645`
- `0313-9235645`
- `03717400624`

Sources locked in code:

- `src/components/whatsapp-agent.tsx` → `AGENT_PHONE_DISPLAY`
- `src/components/call-link.tsx` → `CALL_TEL` / `CALL_DISPLAY`
- `src/lib/menu.ts` → `RESTAURANT.*`
- `src/lib/server/seed.ts` → force-updates DB on every catalog load
- `src/routes/index.tsx` / `site-footer.tsx` → local constants

After deploy: hard refresh (Ctrl+Shift+R). If still wrong, Vercel → Deployments → Redeploy.
