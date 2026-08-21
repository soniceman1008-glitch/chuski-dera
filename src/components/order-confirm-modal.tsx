import { useEffect } from "react";
import { Check } from "lucide-react";

const ASK = "کیا آپ اپنا آرڈر کنفرم کرنا چاہتے ہیں؟";
const OK =
  "چسکی ڈیرہ سے آرڈر کرنے کا بہت شکریہ۔ ہم آپ کے آرڈر کی قدر کرتے ہیں اور امید کرتے ہیں کہ آپ اپنے کھانے سے لطف اندوز ہوں گے۔ آپ کا دن خوشگوار گزرے!";

export function OrderConfirmModal({
  open,
  phase,
  waReady,
  waOpened,
  onConfirm,
  onCancel,
  onDone,
  onOpenWhatsApp,
}: {
  open: boolean;
  phase: "ask" | "done";
  waReady: boolean;
  waOpened: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDone: () => void;
  onOpenWhatsApp: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") (phase === "ask" ? onCancel : onDone)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, onCancel, onDone]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-bg/75"
        aria-label="Close confirmation"
        onClick={phase === "ask" ? onCancel : onDone}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-confirm-title"
        dir="rtl"
        lang="ur"
        className="relative w-full max-w-md rounded-xl bg-surface p-6 text-right shadow-[var(--shadow-card)]"
      >
        {phase === "ask" ? (
          <>
            <h2
              id="order-confirm-title"
              className="text-xl font-semibold leading-relaxed sm:text-2xl"
            >
              {ASK}
            </h2>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                autoFocus
                onClick={onConfirm}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]"
              >
                آرڈر کنفرم کریں
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-lg px-4 text-sm font-medium text-fg ring-1 ring-border transition-colors hover:bg-elevated"
              >
                منسوخ کریں
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid size-11 place-items-center rounded-full bg-primary/15 text-primary">
              <Check className="size-5" strokeWidth={2.5} />
            </div>
            <h2
              id="order-confirm-title"
              className="mt-4 text-xl font-semibold leading-relaxed sm:text-2xl"
            >
              {OK}
            </h2>
            {waReady ? (
              <div className="mt-6 flex flex-col gap-2">
                {!waOpened && (
                  <button
                    type="button"
                    autoFocus
                    onClick={onOpenWhatsApp}
                    className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-whatsapp text-sm font-semibold text-whatsapp-fg transition-transform duration-150 hover:bg-whatsapp-hot active:scale-[0.96]"
                  >
                    WhatsApp پر بھیجیں
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDone}
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]"
                >
                  ٹھیک ہے
                </button>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted">آواز ختم ہونے کے بعد WhatsApp کھلے گا۔</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
