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
    if (/^en/.test(v.lang.toLowerCase())) n += 15;
    if (/en-in|india|neerja/.test(hay)) n += 5;
    return n;
  }
  if (lang === "hi") {
    if (/hi-in|hindi|swara|heera|ananya|aditi/.test(hay)) n += 20;
    return n;
  }
  if (lang === "pa") {
    if (/pa-|punjabi|gurmukhi/.test(hay)) n += 20;
    else if (/hi-in|hindi/.test(hay)) n += 8;
    return n;
  }
  if (/ur-pk|urdu|uzma|pakistan/.test(hay)) n += 20;
  else if (/hi-in|hindi|swara/.test(hay)) n += 8;
  else if (/^en/.test(v.lang.toLowerCase())) n -= 6;
  return n;
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  return [...voices].sort((a, b) => scoreVoice(b, lang) - scoreVoice(a, lang))[0] ?? null;
}

function ttsLang(lang?: VoiceLang) {
  if (lang === "en") return "en-IN";
  if (lang === "hi") return "hi-IN";
  if (lang === "pa") return "pa-IN";
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

async function playBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  await new Promise<void>((resolve) => {
    const audio = new Audio(url);
    current = audio;
    const done = () => {
      if (current === audio) current = null;
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    void audio.play().catch(done);
    window.setTimeout(done, 20_000);
  });
  return url;
}

async function speakElevenLabs(script: string, lang: VoiceLang): Promise<string | null> {
  const res = await fetch("/api/agent-tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: script, lang }),
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  if (blob.size < 200) return null;
  return playBlob(blob);
}

export async function speakAgentReply(text: string, lang: VoiceLang): Promise<string | null> {
  if (typeof window === "undefined") return null;
  stopAgentVoice();
  const script = voiceScript(text);
  const replyLang = lang || "en";
  try {
    const url = await speakElevenLabs(script, replyLang);
    if (url) return url;
  } catch {
    /* browser fallback */
  }
  await speakBrowser(script, replyLang);
  return null;
}

export function permissionHelp(): string {
  return [
    "مائیکروفون اجازت نہیں ملی۔",
    "Chrome/Edge: ایڈریس بار کے لاک آئیکن سے مائیکروفون Allow کریں۔",
    "آئی فون: Settings → Safari → Microphone → Allow، پھر صفحہ ریفریش کریں۔",
  ].join("\n");
}

export async function requestMicPermission(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: "اس براؤزر میں مائیکروفون نہیں چلتا۔ Chrome استعمال کریں۔" };
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
      return { ok: false, error: "مائیکروفون نہیں ملا۔ ہیڈسٹ یا فون مائیک چیک کریں۔" };
    }
    if (name === "NotReadableError") {
      return { ok: false, error: "مائیکروفون کسی اور ایپ میں لگا ہے۔ اسے بند کر کے دوبارہ کوشش کریں۔" };
    }
    if (name === "SecurityError") {
      return { ok: false, error: "مائیکروفون کے لیے محفوظ HTTPS چاہیے۔" };
    }
    return { ok: false, error: permissionHelp() };
  }
}

export type VoiceCaptureResult = {
  transcript: string;
  audioUrl: string | null;
  audioBlob: Blob | null;
  durationMs: number;
  error?: string;
};

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

async function transcribeBlob(blob: Blob): Promise<string> {
  const type = blob.type || "audio/webm";
  const name = type.includes("mp4") ? "speech.m4a" : "speech.webm";
  const file = new File([blob], name, { type });
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  let data: { text?: string; error?: string } = {};
  try {
    data = (await res.json()) as { text?: string; error?: string };
  } catch {
    data = {};
  }
  if (!res.ok) throw new Error(data.error || "آواز سمجھ نہیں آئی۔");
  const text = String(data.text ?? "").trim();
  if (!text) throw new Error("آواز سمجھ نہیں آئی۔ مائیک کے قریب دو تین سیکنڈ آہستہ بولیں۔");
  return text;
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
      recorder.start(200);
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
          let error: string | undefined;
          if (chunks.length) {
            audioBlob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
            audioUrl = URL.createObjectURL(audioBlob);
            if (durationMs < 700) {
              error = "کلپ بہت چھوٹی ہے۔ مائیک دبائیں، دو تین سیکنڈ بولیں، پھر روکیں۔";
            } else {
              try {
                transcript = nlpClean(await transcribeBlob(audioBlob));
              } catch (e) {
                error = e instanceof Error ? e.message : "آواز سمجھ نہیں آئی۔";
              }
            }
          }
          recorder = null;
          resolve({ transcript, audioUrl, audioBlob, durationMs, error });
        };
        if (recorder && recorder.state !== "inactive") {
          recorder.onstop = () => void finish();
          try {
            recorder.requestData();
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
