import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, RotateCcw, Send, Square, X } from "lucide-react";
import { RESTAURANT } from "@/lib/menu";
import { useCart } from "@/lib/cart-store";
import { whatsappOrderHref } from "@/lib/whatsapp";
import {
  createVoiceSession,
  requestMicPermission,
  revokeVoiceUrl,
  speakAgentReply,
  stopAgentVoice,
  type VoiceCaptureResult,
  type VoiceSession,
} from "@/lib/agent-voice";
import {
  agentReply,
  clarifyLanguage,
  detectLang,
  greet,
  initialAgentState,
  isVoiceUnclear,
  type AgentLang,
  type AgentState,
} from "@/lib/wa-agent";

const AGENT_PHONE_DISPLAY = "0313-9235654";

type VoicePhase = "idle" | "asking" | "recording" | "preview" | "processing" | "speaking";

type ChatMsg = {
  id: number;
  role: "bot" | "user";
  text: string;
  voice?: boolean;
  audioUrl?: string | null;
  lang?: AgentLang;
};

function formatTimer(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function WhatsAppAgent({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const setCustomer = useCart((s) => s.setCustomer);
  const customer = useCart((s) => s.customer);
  const [state, setState] = useState<AgentState>(() => initialAgentState(customer));
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [booted, setBooted] = useState(false);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [denied, setDenied] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<VoiceCaptureResult | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const stateRef = useRef(state);
  const sessionRef = useRef<VoiceSession | null>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<number | null>(null);
  const urlsRef = useRef<string[]>([]);
  stateRef.current = state;

  useEffect(() => {
    if (!open) return;
    if (!booted) {
      const next = initialAgentState(customer);
      setState(next);
      const hello = greet("ur");
      const id = idRef.current++;
      setMsgs([{ id, role: "bot", text: hello, voice: true, lang: "ur" }]);
      setBooted(true);
      setPhase("speaking");
      void speakAgentReply(hello, "ur").then((url) => {
        if (url) {
          urlsRef.current.push(url);
          setMsgs((m) => m.map((row) => (row.id === id ? { ...row, audioUrl: url } : row)));
        }
        setPhase("idle");
      });
    }
  }, [open, booted, customer]);

  useEffect(() => {
    if (!open) {
      setBooted(false);
      stopAgentVoice();
      sessionRef.current?.cancel();
      sessionRef.current = null;
      previewAudio.current?.pause();
      if (tickRef.current) window.clearInterval(tickRef.current);
      urlsRef.current.forEach((u) => revokeVoiceUrl(u));
      urlsRef.current = [];
      setPhase("idle");
      setDenied(null);
      setPreview(null);
      setElapsed(0);
    }
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, phase]);

  function push(
    role: ChatMsg["role"],
    text: string,
    voice = false,
    audioUrl: string | null = null,
    lang?: AgentLang,
  ) {
    if (audioUrl) urlsRef.current.push(audioUrl);
    const id = idRef.current++;
    setMsgs((m) => [...m, { id, role, text, voice, audioUrl, lang }]);
    return id;
  }

  function send(text: string, viaVoice = false, audioUrl: string | null = null) {
    const value = text.trim();
    if (!viaVoice && !value) return;

    if (viaVoice && isVoiceUnclear(value)) {
      if (audioUrl) push("user", "", true, audioUrl, stateRef.current.lang);
      const ask = clarifyLanguage("ur");
      window.setTimeout(() => {
        void (async () => {
          const id = push("bot", ask, true, null, "ur");
          setPhase("speaking");
          await speakAgentReply(ask, "ur");
          setPhase("idle");
        })();
      }, 200);
      return;
    }

    if (!value) return;

    if (viaVoice) push("user", value, true, audioUrl, "ur");
    else push("user", value, false);
    setDraft("");
    const result = agentReply(stateRef.current, value);
    setState(result.state);
    stateRef.current = result.state;
    window.setTimeout(() => {
      void (async () => {
        for (const line of result.messages) {
          push("bot", line, true, null, "ur");
          setPhase("speaking");
          await speakAgentReply(line, "ur");
        }
        setPhase("idle");
        if (result.sendWhatsApp && result.state.lines.length) {
          setCustomer(result.state.customer);
          window.open(
            whatsappOrderHref(result.state.lines, result.state.customer),
            "_blank",
            "noopener,noreferrer",
          );
        }
      })();
    }, 220);
  }

  function clearPreview() {
    previewAudio.current?.pause();
    previewAudio.current = null;
    setPreviewPlaying(false);
    if (preview?.audioUrl && !urlsRef.current.includes(preview.audioUrl)) {
      revokeVoiceUrl(preview.audioUrl);
    }
    setPreview(null);
  }

  async function beginRecord() {
    if (phase === "recording" || phase === "processing" || phase === "speaking") return;
    setDenied(null);
    clearPreview();
    stopAgentVoice();
    setPhase("asking");
    const perm = await requestMicPermission();
    if (!perm.ok) {
      setDenied(perm.error ?? "Mic allow karein.");
      setPhase("idle");
      return;
    }
    const session = createVoiceSession("ur");
    sessionRef.current = session;
    try {
      await session.start();
    } catch {
      setDenied("Microphone start nahi ho saka.");
      setPhase("idle");
      return;
    }
    setElapsed(0);
    setPhase("recording");
    if (tickRef.current) window.clearInterval(tickRef.current);
    const t0 = Date.now();
    tickRef.current = window.setInterval(() => {
      const ms = Date.now() - t0;
      setElapsed(ms);
      if (ms >= 60_000) void stopRecord();
    }, 200);
  }

  async function stopRecord() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      setPhase("idle");
      return;
    }
    const result = await session.stop();
    if (!result.audioUrl && !result.transcript) {
      setDenied("آواز ریکارڈ نہیں ہوئی۔ دوبارہ بولیں۔");
      setPhase("idle");
      return;
    }
    setPreview(result);
    setPhase("preview");
  }

  function cancelRecord() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    sessionRef.current?.cancel();
    sessionRef.current = null;
    clearPreview();
    setElapsed(0);
    setPhase("idle");
  }

  function togglePreviewPlay() {
    if (!preview?.audioUrl) return;
    if (!previewAudio.current) {
      const a = new Audio(preview.audioUrl);
      a.setAttribute("playsinline", "true");
      a.addEventListener("ended", () => setPreviewPlaying(false));
      previewAudio.current = a;
    }
    if (previewPlaying) {
      previewAudio.current.pause();
      setPreviewPlaying(false);
      return;
    }
    void previewAudio.current.play().then(() => setPreviewPlaying(true)).catch(() => setPreviewPlaying(false));
  }

  function sendPreview() {
    if (!preview) return;
    const clip = preview;
    setPreview(null);
    previewAudio.current?.pause();
    previewAudio.current = null;
    setPreviewPlaying(false);
    setPhase("processing");
    send(clip.transcript || "(voice)", true, clip.audioUrl);
  }

  async function replayBot(msg: ChatMsg) {
    stopAgentVoice();
    setPhase("speaking");
    await speakAgentReply(msg.text, "ur");
    setPhase("idle");
  }

  if (!open) return null;

  const busy = phase === "processing" || phase === "speaking" || phase === "asking";

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-end sm:p-4">
      <button type="button" className="absolute inset-0 bg-bg/50 sm:bg-bg/40" aria-label="Close chat" onClick={onClose} />
      <section
        role="dialog"
        aria-label="Chuski Dera AI Agent"
        className="relative flex h-[min(100dvh,40rem)] w-full max-w-md flex-col overflow-hidden bg-[#0b141a] shadow-[var(--shadow-card)] sm:h-[min(90dvh,40rem)] sm:rounded-xl"
      >
        <header className="flex items-center gap-3 bg-[#075e54] px-3 py-2.5 text-white">
          <div className="grid size-10 place-items-center rounded-full bg-[#25d366] text-sm font-bold text-[#075e54]">
            CD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{RESTAURANT.name}</p>
            <p className="truncate text-xs text-white/80">{AGENT_PHONE_DISPLAY} · اردو ایجنٹ</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Close chat">
            <X className="size-5" />
          </button>
        </header>

        <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {msgs.map((msg) => (
            <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  msg.role === "user"
                    ? "max-w-[85%] rounded-lg rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm leading-relaxed text-white"
                    : "max-w-[85%] rounded-lg rounded-tl-sm bg-[#1f2c34] px-3 py-2 text-sm leading-relaxed text-[#e9edef]"
                }
              >
                {msg.role === "bot" ? (
                  <div className="mb-1">
                    <button type="button" onClick={() => void replayBot(msg)} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[11px] text-white">
                      <Play className="size-3" /> سنو
                    </button>
                  </div>
                ) : null}
                {msg.text ? <p className="whitespace-pre-wrap">{msg.text}</p> : null}
              </div>
            </div>
          ))}
          {denied && <div className="rounded-lg bg-[#1f2c34] px-3 py-2 text-xs text-[#ffd7d7]">{denied}</div>}
          {phase === "recording" && <p className="text-center text-xs text-red-300">ریکارڈنگ {formatTimer(elapsed)}</p>}
          {phase === "processing" && <p className="text-center text-xs text-white/50">سن رہی ہوں…</p>}
          {phase === "speaking" && <p className="text-center text-xs text-white/50">بول رہی ہوں…</p>}
        </div>

        {phase === "recording" || phase === "preview" ? (
          <div className="border-t border-white/5 bg-[#1f2c34] px-3 py-3">
            {phase === "recording" ? (
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                <p className="flex-1 text-sm text-white">{formatTimer(elapsed)}</p>
                <button type="button" onClick={() => void stopRecord()} className="inline-flex h-10 items-center rounded-lg bg-red-500 px-3 text-sm font-semibold text-white">
                  <Square className="size-3.5" /> روکیں
                </button>
                <button type="button" onClick={cancelRecord} className="grid size-10 place-items-center rounded-lg bg-[#2a3942] text-white">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={togglePreviewPlay} className="grid size-10 place-items-center rounded-full bg-[#2a3942] text-white">
                  {previewPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <p className="min-w-0 flex-1 text-xs text-white/70">{preview?.transcript || "بھیجیں"}</p>
                <button type="button" onClick={() => void beginRecord()} className="grid size-10 place-items-center rounded-lg bg-[#2a3942] text-white">
                  <RotateCcw className="size-4" />
                </button>
                <button type="button" onClick={sendPreview} className="inline-flex h-10 items-center gap-1 rounded-lg bg-[#25d366] px-3 text-sm font-semibold text-[#052e16]">
                  <Send className="size-4" /> بھیجیں
                </button>
              </div>
            )}
          </div>
        ) : (
          <form
            className="flex items-end gap-2 bg-[#1f2c34] p-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) send(draft, false);
            }}
          >
            <button type="button" onClick={() => void beginRecord()} disabled={busy} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#2a3942] text-white disabled:opacity-50">
              <Mic className="size-5" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={1}
              placeholder="پیغام لکھیں…"
              className="max-h-28 min-h-11 flex-1 resize-none rounded-lg bg-[#2a3942] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
            />
            <button type="submit" disabled={busy} className="inline-flex h-11 shrink-0 items-center rounded-lg bg-[#25d366] px-4 text-sm font-semibold text-[#052e16] disabled:opacity-50">
              بھیجیں
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
