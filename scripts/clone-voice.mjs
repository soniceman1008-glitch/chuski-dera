/**
 * One-time ElevenLabs instant clone from a reference recording.
 *
 * Requires:
 *   VOICE_CLONE_PERMISSION=true
 *   ELEVENLABS_API_KEY=...
 *   A reference file the owner has allowed us to use.
 *
 * Usage:
 *   VOICE_CLONE_PERMISSION=true ELEVENLABS_API_KEY=... node scripts/clone-voice.mjs public/audio/reference.ogg
 *
 * Then put the printed voice id into Vercel as ELEVENLABS_VOICE_ID and redeploy.
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const file = process.argv[2] || "public/audio/reference.ogg";

if (process.env.VOICE_CLONE_PERMISSION !== "true") {
  console.error("Refusing to clone: set VOICE_CLONE_PERMISSION=true (owner permission)."
  );
  process.exit(1);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}

const buf = await readFile(file);
const form = new FormData();
form.append("name", "Chuski Dera staff (permitted)");
form.append(
  "description",
  "Restaurant receptionist clone. Use only with owner permission.",
);
form.append("files", new Blob([buf]), basename(file));
form.append("labels", JSON.stringify({ brand: "chuski-dera", permission: "owner" }));

const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
  method: "POST",
  headers: { "xi-api-key": key },
  body: form,
});

if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}

const json = await res.json();
console.log("Cloned voice id:", json.voice_id);
console.log("Add this on Vercel as ELEVENLABS_VOICE_ID, keep VOICE_CLONE_PERMISSION=true, then Redeploy.");
