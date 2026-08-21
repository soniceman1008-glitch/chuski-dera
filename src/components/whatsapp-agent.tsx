import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { RESTAURANT } from "@/lib/menu";
import { useCart } from "@/lib/cart-store";
import { whatsappOrderHref } from "@/lib/whatsapp";
import {
  requestMicPermission,
  speakAgentReply,
  startVoiceCapture,
  stopAgentVoice,
} from "@/lib/agent-voice";
import {
  agentReply,
  detectLang,
  greet,
  initialAgentState,
  type AgentState,
} from "@/lib/wa-agent";

type ChatMsg = {
  id: number;
  role: "bot" | "user";
  text: string;
  voice?: boolean;
  audioUrl?: string | null;
};

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
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const stateRef = useRef(state);
  const stopListen = useRef<(() => void) | null>(null);
  stateRef.current = state;

  useEffect(() => {
    if (!open) return;
    if (!booted) {
      const next = initialAgentState(customer);
      setState(next);
      const hello = greet("ru");
      setMsgs([{ id: idRef.current++, role: "bot", text: hello, voice: true }]);
      setBooted(true);
      void speakAgentReply(hello, "ru");
    }
  }, [open, booted, customer]);

  useEffect(() => {
    if (!open) {
      setBooted(false);
      stopAgentVoice();
      stopListen.current?.();
      setListening(false);
      setSpeaking(false);
    }
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  function push(role: ChatMsg["role"], text: string, voice = false, audioUrl: string | null = null) {
    setMsgs((m) => [...m, { id: idRef.current++, role, text, voice, audioUrl }]);
  }

  function send(text: string, viaVoice = false, audioUrl: string | null = null) {
    const value = text.trim();
    if (!value) return;
    // Voice path: show as audio bubble, not plain text
    if (viaVoice) {
      push("user", value, true, audioUrl);
    } else {
      push("user", value, false);
    }
    setDraft("");
    const result = agentReply(stateRef.current, value);
    setState(result.state);
    stateRef.current = result.state;
    window.setTimeout(() => {
      void (async () => {
        for (const line of result.messages) {
          // Voice conversation: mark bot as voice; still keep short text for accessibility
          push("bot", line, viaVoice);
          if (viaVoice) {
            setSpeaking(true);
            await speakAgentReply(line, result.state.lang);
            setSpeaking(false);
          }
        }
        if (result.sendWhatsApp && result.state.lines.length) {
          setCustomer(result.state.customer);
          window.open(
            whatsappOrderHref(result.state.lines, result.state.customer),
            "_blank",
            "noopener,noreferrer",
          );
        }
      })();
    }, 280);
  }

  async function toggleMic() {
    if (listening) {
      stopListen.current?.();
      stopListen.current = null;
      setListening(false);
      return;
    }

    stopAgentVoice();
    setSpeaking(false);

    const perm = await requestMicPermission();
    if (!perm.ok) {
      push("bot", perm.error ?? "Mic permission chahiye.");
      return;
    }

    setListening(true);
    stopListen.current = startVoiceCapture(
      stateRef.current.lang,
      (result) => {
        setListening(false);
        stopListen.current = null;
        // Detect language from spoken words so AI replies in same language
        if (result.transcript && result.transcript !== "(voice)") {
          const lang = detectLang(result.transcript);
          stateRef.current = { ...stateRef.current, lang };
          setState(stateRef.current);
        }
        send(result.transcript, true, result.audioUrl);
      },
      (msg) => {
        setListening(false);
        stopListen.current = null;
        push("bot", msg);
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-end sm:p-4">
      <button type="button" className="absolute inset-0 bg-bg/50 sm:bg-bg/40" aria-label="Close chat" onClick={onClose} />
      <section
        role="dialog"
        aria-label="Chuski Dera WhatsApp"
        className="relative flex h-[min(100dvh,40rem)] w-full max-w-md flex-col overflow-hidden bg-[#0b141a] shadow-[var(--shadow-card)] sm:h-[min(90dvh,40rem)] sm:rounded-xl"
      >
        <header className="flex items-center gap-3 bg-[#075e54] px-3 py-2.5 text-white">
          <div className="grid size-10 place-items-center rounded-full bg-[#25d366] text-sm font-bold text-[#075e54]">
            CD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{RESTAURANT.name}</p>
            <p className="truncate text-xs text-white/80">
              {RESTAURANT.phoneDisplay} · AI · voice & text
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full hover:bg-white/10"
            aria-label="Close WhatsApp"
          >
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
                {msg.voice && (
                  <p className="mb-1 text-[11px] tracking-wide text-white/60 uppercase">
                    {msg.role === "user" ? "Voice message" : "Voice reply"}
                  </p>
                )}
                {msg.audioUrl ? (
                  <audio controls src={msg.audioUrl} className="mb-1 max-w-full" preload="metadata" />
                ) : null}
                {/* Voice user messages: don't dump transcript as main content */}
                {msg.role === "user" && msg.voice ? null : (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          ))}
          {listening && (
            <p className="text-center text-xs text-white/50">Listening… bolna shuru karein</p>
          )}
          {speaking && (
            <p className="text-center text-xs text-white/50">AI bol rahi hai…</p>
          )}
        </div>

        <form
          className="flex items-end gap-2 bg-[#1f2c34] p-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft, false);
          }}
        >
          <button
            type="button"
            onClick={() => void toggleMic()}
            aria-label={listening ? "Stop listening" : "Voice message"}
            className={
              listening
                ? "grid size-11 shrink-0 place-items-center rounded-full bg-red-500 text-white"
                : "grid size-11 shrink-0 place-items-center rounded-full bg-[#2a3942] text-white"
            }
          >
            {listening ? <Square className="size-4" /> : <Mic className="size-5" />}
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft, false);
              }
            }}
            rows={1}
            placeholder={listening ? "Listening…" : speaking ? "AI speaking…" : "Message"}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-lg bg-[#2a3942] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center rounded-lg bg-[#25d366] px-4 text-sm font-semibold text-[#052e16]"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
