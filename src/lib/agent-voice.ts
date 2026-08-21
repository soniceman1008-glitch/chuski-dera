import type { VoiceLang } from "./voice-lang";
import { nlpClean, nlpSpeakable } from "./nlp";

let current: HTMLAudioElement | null = null;

export function stopAgentVoice() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (!current) return;
  current.pause();
  current.src = "";
  current = null;
}

export function voiceScript(text: string) {
  const spoken = nlpSpeakable(text) || text.trim();
  if (spoken.length <= 220) return spoken;
  const first = spoken.split("\n")[0] ?? spoken;
  return `${first.slice(0, 200)}.`;
}

function isFemaleVoice(v: SpeechSynthesisVoice) {
  return /female|woman|girl|neerja|swara|uzma|heera|zira|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|aria|jenny|sonia|ava|emma|joanna|ivy|salli|aditi|ananya/i.test(
    v.name,
  );
}

function isMaleVoice(v: SpeechSynthesisVoice) {
  return /male|\bman\b|david|mark|ravi|george|daniel|fred|alex|richard|thomas|matthew|guy|prabhat/i.test(
    v.name,
  );
}

function scoreVoice(v: SpeechSynthesisVoice, lang: VoiceLang) {
  const hay = `${v.name} ${v.lang}`.toLowerCase();
  let n = 0;
  if (isFemaleVoice(v)) n += 8;
  if (isMaleVoice(v)) n -= 12;
  if (lang === "en") {
    if (/en-in|india/.test(hay)) n += 5;
    else if (/^en/.test(v.lang)) n += 3;
    return n;
  }
  if (/ur/.test(hay)) n += 8;
  if (/pakistan|urdu|uzma/.test(hay)) n += 7;
  if (/hi-in|hindi|swara|heera/.test(hay)) n += 5;
  return n;
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  return [...voices].sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang))[0] ?? null;
}

function ttsLang(lang: VoiceLang) {
  if (lang === "en") return "en-IN";
  if (lang === "hi") return "hi-IN";
  return "ur-PK";
}

async function speakBrowser(script: string, lang: VoiceLang) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const speak = () => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(script);
      u.rate = 0.78;
      u.pitch = 1;
      u.volume = 1;
      u.lang = ttsLang(lang);
      const pick = pickVoice(lang);
      if (pick) u.voice = pick;
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      window.setTimeout(finish, Math.min(20_000, 800 + script.length * 80));
    };
    if (synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", () => speak(), { once: true });
      window.setTimeout(speak, 280);
    } else {
      speak();
    }
  });
}

export async function speakAgentReply(text: string, lang: VoiceLang): Promise<string | null> {
  if (typeof window === "undefined") return null;
  stopAgentVoice();
  await speakBrowser(voiceScript(text), lang);
  return null;
}

export function permissionHelp(): string {
  return [
    "Microphone allow nahi hua.",
    "Chrome/Edge: address bar ke lock/tune icon → Site settings → Microphone → Allow.",
    "Safari iPhone: Settings → Safari → Microphone → Allow, phir page refresh karein.",
    "Android Chrome: site ke ⋮ menu → Permissions → Microphone.",
  ].join("\n");
}

export async function requestMicPermission(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: "Is browser mein microphone support nahi hai. Chrome use karein." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { ok: false, error: permissionHelp() };
    }
    if (name === "NotFoundError") {
      return { ok: false, error: "Koi microphone nahi mila. Headset ya phone mic check karein." };
    }
    if (name === "NotReadableError") {
      return { ok: false, error: "Microphone kisi aur app mein busy hai. Usko band karke try karein." };
    }
    if (name === "SecurityError") {
      return { ok: false, error: "Microphone ke liye HTTPS chahiye." };
    }
    return { ok: false, error: permissionHelp() };
  }
}

export type VoiceCaptureResult = {
  transcript: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  durationMs: number;
};

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const file = new File([blob], blob.type.includes("mp4") ? "speech.mp4" : "speech.webm", {
    type: blob.type || "audio/webm",
  });
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  let data: { text?: string; error?: string } = {};
  try {
    data = (await res.json()) as { text?: string; error?: string };
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || "Awaaz samajh nahi aayi.");
  return String(data.text ?? "").trim();
}

export type VoiceSession = {
  start: () => Promise<void>;
  stop: () => Promise<VoiceCaptureResult>;
  cancel: () => void;
};

export function createVoiceSession(_lang: VoiceLang): VoiceSession {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  const chunks: BlobPart[] = [];
  let startedAt = 0;
  let stopped = false;

  const tearDown = () => {
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* */
    }
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    recorder = null;
  };

  return {
    async start() {
      stopped = false;
      chunks.length = 0;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      const mime = pickMime();
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(250);
      startedAt = Date.now();
    },

    stop() {
      return new Promise<VoiceCaptureResult>((resolve) => {
        if (stopped) {
          resolve({ transcript: "", audioUrl: null, audioBlob: null, durationMs: 0 });
          return;
        }
        stopped = true;
        const durationMs = startedAt ? Date.now() - startedAt : 0;
        const finish = async () => {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          let audioBlob: Blob | null = null;
          let audioUrl: string | null = null;
          let transcript = "";
          if (chunks.length) {
            audioBlob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
            audioUrl = URL.createObjectURL(audioBlob);
            try {
              transcript = nlpClean(await transcribeBlob(audioBlob));
            } catch {
              transcript = "";
            }
          }
          recorder = null;
          resolve({ transcript, audioUrl, audioBlob, durationMs });
        };
        if (recorder && recorder.state !== "inactive") {
          recorder.onstop = () => void finish();
          try {
            recorder.stop();
          } catch {
            void finish();
          }
        } else {
          void finish();
        }
      });
    },

    cancel() {
      stopped = true;
      tearDown();
      chunks.length = 0;
    },
  };
}

export function revokeVoiceUrl(url: string | null | undefined) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}
