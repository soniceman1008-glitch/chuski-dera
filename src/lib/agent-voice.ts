import type { AgentLang } from "./wa-agent";

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
  if (trimmed.length <= 320) return trimmed;
  const first = trimmed.split("\n")[0] ?? trimmed;
  return `${first.slice(0, 280)}. Details are in the chat.`;
}

function pickVoice(lang: AgentLang): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (lang === "ur") {
    return (
      voices.find((v) => /ur/i.test(v.lang)) ??
      voices.find((v) => /pakistan|urdu/i.test(`${v.name} ${v.lang}`)) ??
      null
    );
  }
  if (lang === "ru") {
    return (
      voices.find((v) => /en-IN|india/i.test(`${v.name} ${v.lang}`)) ??
      voices.find((v) => /en-GB|english/i.test(v.lang) && /female|samantha|zira|sonia/i.test(v.name)) ??
      null
    );
  }
  return (
    voices.find((v) => /en-GB|en-US/i.test(v.lang) && /female|samantha|zira|sonia|google uk english female/i.test(v.name)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

/** Speak AI reply in the sender's language (audio only path). */
export async function speakAgentReply(text: string, lang: AgentLang): Promise<void> {
  if (typeof window === "undefined") return;
  stopAgentVoice();
  const script = voiceScript(text);
  const synth = window.speechSynthesis;
  if (!synth) return;

  await new Promise<void>((resolve) => {
    const speak = () => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(script);
      u.rate = 0.9;
      u.pitch = 1;
      u.volume = 1;
      u.lang = lang === "ur" ? "ur-PK" : lang === "ru" ? "en-IN" : "en-GB";
      const pick = pickVoice(lang);
      if (pick) u.voice = pick;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    };n    if (synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", () => speak(), { once: true });
      window.setTimeout(speak, 300);
    } else {
      speak();
    }
  });
}

/** Ask for microphone permission explicitly. */
export async function requestMicPermission(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: "Microphone is not supported on this browser." };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { ok: false, error: "Mic permission blocked. Browser settings se allow karein." };
    }
    if (name === "NotFoundError") {
      return { ok: false, error: "Koi microphone nahi mila." };
    }
    return { ok: false, error: "Microphone open nahi ho saka." };
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
  /** Transcript for the agent brain (not shown as plain chat if prefer audio UI). */
  transcript: string;
  /** Recorded audio blob for playable voice bubble. */
  audioUrl: string | null;
};

/**
 * Record real audio + speech-to-text for understanding.
 * UI can show audio; agent uses transcript.
 */
export function startVoiceCapture(
  lang: AgentLang,
  onDone: (result: VoiceCaptureResult) => void,
  onError: (msg: string) => void,
): () => void {
  let stopped = false;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  const chunks: BlobPart[] = [];
  let transcript = "";
  let recog: Recog | null = null;

  const finish = () => {
    if (stopped) return;
    stopped = true;
    try {
      recog?.stop();
    } catch {
      /* */
    }
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      /* */
    }
    stream?.getTracks().forEach((t) => t.stop());
  };

  void (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Mic permission chahiye. Browser address bar se Allow karein.");
      return;
    }

    try {
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        let audioUrl: string | null = null;
        if (chunks.length) {
          const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
          audioUrl = URL.createObjectURL(blob);
        }
        const text = transcript.trim();
        if (!text && !audioUrl) {
          onError("Kuch suna nahi gaya. Dobara try karein.");
          return;
        }
        onDone({ transcript: text || "(voice)", audioUrl });
      };
      recorder.start();
    } catch {
      /* recording optional; STT still works */
    }

    const Ctor =
      (
        window as unknown as {
          SpeechRecognition?: new () => Recog;
          webkitSpeechRecognition?: new () => Recog;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;

    if (!Ctor) {
      // Still allow pure recording; without STT agent can't understand
      window.setTimeout(() => {
        if (stopped) return;
        finish();
      }, 8000);
      onError("Is browser mein speech-to-text nahi hai. Chrome use karein, ya type karein.");
      return;
    }

    recog = new Ctor();
    recog.lang = lang === "ur" ? "ur-PK" : lang === "ru" ? "en-IN" : "en-US";
    recog.interimResults = false;
    recog.continuous = false;
    recog.maxAlternatives = 1;
    recog.onresult = (ev) => {
      const t = ev.results[0]?.[0]?.transcript?.trim();
      if (t) transcript = t;
    };
    recog.onerror = (ev) => {
      if (stopped) return;
      if (ev.error === "not-allowed") {
        finish();
        onError("Mic permission blocked hai.");
      } else if (ev.error === "no-speech") {
        finish();
        onError("Koi awaaz nahi mili. Dobara mic dabayein.");
      } else if (ev.error !== "aborted") {
        finish();
        onError("Voice catch nahi hui. Dobara try karein.");
      }
    };
    recog.onend = () => {
      if (stopped) return;
      finish();
    };
    try {
      recog.start();
    } catch {
      finish();
      onError("Mic start nahi ho saka.");
    }
  })();

  return () => {
    finish();
  };
}
