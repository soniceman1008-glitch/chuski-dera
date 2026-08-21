import type { CallLang } from "./voice-agent";
import { staffForwardNumber } from "./voice-agent";

function xml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sayVoice(lang: CallLang) {
  return lang === "en"
    ? `language="en-US" voice="Polly.Joanna"`
    : `language="ur-IN" voice="Google.hi-IN-Wavenet-A"`;
}

function gatherLang(lang: CallLang) {
  return lang === "en" ? "en-US" : "ur-IN";
}

export function twimlResponse(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export function twimlSayGather(text: string, lang: CallLang, gatherUrl: string) {
  return twimlResponse(
    `<Say ${sayVoice(lang)}>${xml(text)}</Say><Gather input="speech" language="${gatherLang(lang)}" speechTimeout="auto" action="${xml(gatherUrl)}" method="POST" /><Say ${sayVoice(lang)}>${xml(lang === "en" ? "I did not hear you." : "Awaaz nahi aayi.")}</Say><Redirect method="POST">${xml(gatherUrl)}</Redirect>`,
  );
}

export function twimlSayHangup(text: string, lang: CallLang) {
  return twimlResponse(`<Say ${sayVoice(lang)}>${xml(text)}</Say><Hangup/>`);
}

export function twimlTransfer(text: string, lang: CallLang) {
  const dest = staffForwardNumber();
  return twimlResponse(
    `<Say ${sayVoice(lang)}>${xml(text)}</Say><Dial timeout="25"><Number>${xml(dest)}</Number></Dial>`,
  );
}

export function publicBase() {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return (proc?.env?.BETTER_AUTH_URL || proc?.env?.APP_URL || "https://chuski-dera.vercel.app").replace(/\/$/, "");
}
