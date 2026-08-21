import type { VoiceLang } from "./voice-lang";
import { nlpClean, nlpSpeakable, pickAsrTranscript } from "./nlp";

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
  if (lang === "ur") {
    if (/ur/.test(hay)) n += 6;
    if (/pakistan|urdu/.test(hay)) n += 5;
    if (/hi-in|hindi|india/.test(hay)) n += 3;
  } else if (lang === "ru") {
    if (/en-in|india|neerja/.test(hay)) n += 7;
    if (/^en/.test(v.lang)) n += 4;
  } else if (lang === "hi") {
    if (/hi-in|hindi/.test(hay)) n += 6;
  } else if (lang === "pa") {
    if (/\bpa\b|punjabi/.test(hay)) n += 6;
    if (/hi-in|hindi/.test(hay)) n += 3;
  } else if (/en-in|india/.test(hay)) n += 5;
  else if (/^en/.test(v.lang)) n += 3;
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
  if (lang === "ur") return "ur-PK";
  if (lang === "hi") return "hi-IN";
  if (lang === "pa") return "hi-IN";
  return "en-IN";
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
      u.rate = 0.82;
      u.pitch = 1.02;
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

type Recog = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((ev: {
    results: ArrayLike<{ isFinal?: boolean; length: number; [i: number]: { transcript: string; confidence?: number } }>;
  }) => void) | null;
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

function recogLangs(hint: VoiceLang): string[] {
  if (hint === "en") return ["en-IN"];
  if (hint === "hi") return ["hi-IN"];
  if (hint === "pa") return ["pa-IN"];
  if (hint === "ur") return ["ur-PK"];
  return ["en-IN"];
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
  return nlpClean(pickAsrTranscript(parts));
}

export function createVoiceSession(lang: VoiceLang): VoiceSession {
  const recogs: Recog[] = [];
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
  };

  const startOne = (code: string) => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    try {
      const recog = new Ctor();
      recog.lang = code;
      recog.interimResults = true;
      recog.continuous = false;
      recog.maxAlternatives = 5;
      recog.onresult = (ev) => {
        for (let i = 0; i < ev.results.length; i++) {
          const row = ev.results[i];
          if (!row) continue;
          const altCount = typeof row.length === "number" ? row.length : 1;
          for (let a = 0; a < altCount; a++) {
            const alt = row[a]?.transcript?.trim();
            if (alt) transcripts.push(alt);
          }
        }
      };
      recog.onerror = () => {
        /* wait for stop */
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
      /* */
    }
  };

  return {
    async start() {
      stopped = false;
      transcripts.length = 0;
      if (!speechCtor()) {
        throw new Error("Is browser mein voice recognition nahi hai. Chrome use karein.");
      }
      startedAt = Date.now();
      startOne(recogLangs(lang)[0] ?? "en-IN");
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
        window.setTimeout(() => {
          recogs.length = 0;
          resolve({
            transcript: bestTranscript(transcripts),
            audioUrl: null,
            audioBlob: null,
            durationMs,
          });
        }, 350);
      });
    },

    cancel() {
      stopped = true;
      tearDown();
      transcripts.length = 0;
    },
  };
}

export function revokeVoiceUrl(url: string | null | undefined) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}
