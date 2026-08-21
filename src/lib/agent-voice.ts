import type { VoiceLang } from "./voice-lang";

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
  const trimmed = text.trim();
  if (trimmed.length <= 360) return trimmed;
  const first = trimmed.split("\n")[0] ?? trimmed;
  return `${first.slice(0, 320)}.`;
}

function southAsian(voices: SpeechSynthesisVoice[]) {
  return (
    voices.find((v) => /en-IN|hi-IN|ur|pa|hindi|india|pakistan/i.test(`${v.name} ${v.lang}`)) ??
    null
  );
}

function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (lang === "ur" || lang === "ru") {
    return (
      voices.find((v) => /ur/i.test(v.lang)) ??
      voices.find((v) => /pakistan|urdu/i.test(`${v.name} ${v.lang}`)) ??
      southAsian(voices)
    );
  }
  if (lang === "hi") {
    return voices.find((v) => /hi-IN|hindi/i.test(`${v.name} ${v.lang}`)) ?? southAsian(voices);
  }
  if (lang === "pa") {
    return (
      voices.find((v) => /pa/i.test(v.lang)) ??
      voices.find((v) => /punjabi/i.test(`${v.name} ${v.lang}`)) ??
      voices.find((v) => /hi-IN|hindi/i.test(`${v.name} ${v.lang}`)) ??
      southAsian(voices)
    );
  }
  return (
    voices.find((v) => /en-IN|india/i.test(`${v.name} ${v.lang}`)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

function ttsLang(lang: VoiceLang) {
  if (lang === "ur") return "ur-PK";
  if (lang === "hi") return "hi-IN";
  if (lang === "pa") return "pa-IN";
  if (lang === "ru") return "ur-PK";
  return "en-IN";
}

async function playBlobUrl(url: string) {
  stopAgentVoice();
  const a = new Audio(url);
  a.setAttribute("playsinline", "true");
  a.preload = "auto";
  current = a;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    a.addEventListener("ended", done, { once: true });
    a.addEventListener("error", done, { once: true });
    void a.play().catch(() => resolve());
  });
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
      u.rate = 0.9;
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

/** Speak AI reply. Prefers house-voice MP3, then browser TTS. Returns playable URL if any. */
export async function speakAgentReply(text: string, lang: VoiceLang): Promise<string | null> {
  if (typeof window === "undefined") return null;
  stopAgentVoice();
  const script = voiceScript(text);
  try {
    const res = await fetch("/api/agent-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: script, lang }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 200) {
        const url = URL.createObjectURL(blob);
        await playBlobUrl(url);
        return url;
      }
    }
  } catch {
    /* browser fallback */
  }
  await speakBrowser(script, lang);
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

type Recog = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

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

function recogLangs(hint: VoiceLang): string[] {
  const primary =
    hint === "ur" ? "ur-PK" : hint === "pa" ? "pa-IN" : hint === "hi" ? "hi-IN" : hint === "ru" ? "en-IN" : "en-US";
  const extras = ["en-IN", "ur-PK", "hi-IN", "pa-IN", "en-US"];
  return [primary, ...extras.filter((x) => x !== primary)];
}

function speechCtor(): (new () => Recog) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recog;
    webkitSpeechRecognition?: new () => Recog;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceSession = {
  start: () => Promise<void>;
  stop: () => Promise<VoiceCaptureResult>;
  cancel: () => void;
};

function bestTranscript(parts: string[]) {
  return (
    parts
      .map((s) => s.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)[0] ?? ""
  );
}

export function createVoiceSession(lang: VoiceLang): VoiceSession {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  const recogs: Recog[] = [];
  const chunks: BlobPart[] = [];
  const transcripts: string[] = [];
  let startedAt = 0;
  let stopped = false;

  const tearDown = () => {
    for (const r of recogs) {
      try {
        r.abort();
      } catch {
        /* */
      }
    }
    recogs.length = 0;
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* */
    }
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  const startOne = (code: string) => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    try {
      const recog = new Ctor();
      recog.lang = code;
      recog.interimResults = true;
      recog.continuous = true;
      recog.maxAlternatives = 1;
      recog.onresult = (ev) => {
        const parts: string[] = [];
        for (let i = 0; i < ev.results.length; i++) {
          const bit = ev.results[i]?.[0]?.transcript?.trim();
          if (bit) parts.push(bit);
        }
        if (parts.length) transcripts.push(parts.join(" "));
      };
      recog.onerror = () => {
        /* keep recording */
      };
      recog.onend = () => {
        if (stopped) return;
        try {
          recog.start();
        } catch {
          /* */
        }
      };
      recog.start();
      recogs.push(recog);
    } catch {
      /* one engine is enough */
    }
  };

  return {
    async start() {
      stopped = false;
      chunks.length = 0;
      transcripts.length = 0;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mime = pickMime();
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.start(250);
      startedAt = Date.now();
      const langs = recogLangs(lang);
      startOne(langs[0] ?? "en-IN");
      if (langs[1]) startOne(langs[1]);
    },

    stop() {
      return new Promise<VoiceCaptureResult>((resolve) => {
        if (stopped) {
          resolve({ transcript: "", audioUrl: null, audioBlob: null, durationMs: 0 });
          return;
        }
        stopped = true;
        const durationMs = startedAt ? Date.now() - startedAt : 0;
        for (const r of recogs) {
          try {
            r.stop();
          } catch {
            /* */
          }
        }
        const finish = () => {
          stream?.getTracks().forEach((t) => t.stop());
          stream = null;
          recogs.length = 0;
          let audioBlob: Blob | null = null;
          let audioUrl: string | null = null;
          if (chunks.length) {
            audioBlob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
            audioUrl = URL.createObjectURL(audioBlob);
          }
          resolve({
            transcript: bestTranscript(transcripts),
            audioUrl,
            audioBlob,
            durationMs,
          });
        };
        window.setTimeout(() => {
          if (recorder && recorder.state !== "inactive") {
            recorder.onstop = finish;
            try {
              recorder.stop();
            } catch {
              finish();
            }
          } else {
            finish();
          }
        }, 180);
      });
    },

    cancel() {
      stopped = true;
      tearDown();
      chunks.length = 0;
      transcripts.length = 0;
    },
  };
}

export function revokeVoiceUrl(url: string | null | undefined) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}
