import { createFileRoute } from "@tanstack/react-router";
import { addTurn, handleSpeech, loadCall, saveCall } from "@/lib/server/voice-agent";
import { getSql } from "@/lib/db";
import { publicBase, twimlSayGather, twimlSayHangup, twimlTransfer } from "@/lib/server/voice-twiml";

async function handle(request: Request) {
  const form = await request.formData().catch(() => new FormData());
  const callSid = String(form.get("CallSid") || "");
  const speech = String(form.get("SpeechResult") || form.get("UnstableSpeechResult") || "").trim();
  const gather = `${publicBase()}/api/voice/gather`;
  if (!callSid) return twimlSayHangup("Call session missing.", "en");
  try {
    const sql = await getSql();
    await sql`update call_sessions set last_speech = ${speech} where id = ${callSid}`;
    const state = await loadCall(callSid);
    if (!state) return twimlSayHangup("Session nahi mili.", "ur");
    if (speech) await addTurn(callSid, "user", speech);
    const reply = await handleSpeech(state, speech || "");
    await addTurn(callSid, "agent", reply.say);
    await saveCall(state);
    if (reply.transfer) return twimlTransfer(reply.say, reply.lang);
    if (reply.hangup) return twimlSayHangup(reply.say, reply.lang);
    return twimlSayGather(reply.say, reply.lang, gather);
  } catch (err) {
    console.error("[voice] gather", err);
    return twimlSayHangup("Technical issue. Please try again.", "en");
  }
}

export const Route = createFileRoute("/api/voice/gather")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
