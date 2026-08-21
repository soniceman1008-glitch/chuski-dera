import type { AgentLang } from "./wa-agent";

let current: HTMLAudioElement | null = null;

export function stopAgentVoice() {
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

export async function speakAgentReply(text: string, lang: AgentLang) {
  if (typeof window === "undefined") return;
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
        const audio = new Audio(url);
        audio.setAttribute("playsinline", "true");
        audio.volume = 0.9;
        current = audio;
        audio.addEventListener("ended", () => {
          URL.revokeObjectURL(url);
          if (current === audio) current = null;
        });
        await audio.play();
        return;
      }
    }
  } catch {
    /* fall through */
  }
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(script);
  u.rate = 0.88;
  u.pitch = 1;
  u.volume = 0.9;
  u.lang = lang === "ur" ? "ur-PK" : lang === "ru" ? "en-IN" : "en-GB";
  const voices = synth.getVoices();
  const pick = voices.find((v) =>
    lang === "ur"
      ? /ur/i.test(v.lang)
      : lang === "ru"
        ? /en-IN|india/i.test(`${v.name} ${v.lang}`)
        : /female|samantha|zira|google uk english female|sonia/i.test(v.name),
  );
  if (pick) u.voice = pick;
  synth.speak(u);
}

type Recog = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function startListening(
  lang: AgentLang,
  onText: (text: string) => void,
  onError: (msg: string) => void,
): () => void {
  const Ctor =
    (
      window as unknown as {
        SpeechRecognition?: new () => Recog;
        webkitSpeechRecognition?: new () => Recog;
      }
    ).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Recog }).webkitSpeechRecognition;
  if (!Ctor) {
    onError("Voice input is not available here. Please type.");
    return () => {};
  }
  const rec = new Ctor();
  rec.lang = lang === "ur" ? "ur-PK" : lang === "ru" ? "en-IN" : "en-US";
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (ev) => {
    const text = ev.results[0]?.[0]?.transcript?.trim();
    if (text) onText(text);
  };
  rec.onerror = (ev) => {
    if (ev.error === "not-allowed") onError("Mic permission is needed for voice.");
    else if (ev.error !== "aborted") onError("Could not catch that. Try again or type.");
  };
  rec.onend = () => {};
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}
