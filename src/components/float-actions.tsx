import { useState } from "react";
import { Phone } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";
import { WhatsAppAgent } from "@/components/whatsapp-agent";
import { CallLink } from "@/components/call-link";

function WhatsAppGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.15 6.37 2.15 11.75c0 1.72.46 3.4 1.33 4.88L2 22l5.54-1.43a10.1 10.1 0 0 0 4.5 1.06h.01c5.46 0 9.89-4.37 9.89-9.75S17.5 2 12.04 2Zm5.75 13.9c-.25.7-1.45 1.28-1.98 1.36-.5.08-1.14.11-1.84-.12-.42-.13-.97-.32-1.67-.62-2.94-1.27-4.85-4.23-5-4.42-.14-.2-1.18-1.57-1.18-3s.73-2.12.99-2.41c.25-.29.55-.36.73-.36h.53c.17 0 .4 0 .61.47.22.5.74 1.82.8 1.95.07.13.11.29.02.47-.08.16-.13.29-.26.45-.13.16-.27.35-.39.47-.13.13-.26.27-.11.53.14.25.64 1.06 1.38 1.72.95.85 1.75 1.12 2 .25.14-.16.31-.29.48-.18.17.1 1.07.5 1.26.6.18.08.3.13.35.2.04.08.04.45-.2 1.14Z" />
    </svg>
  );
}

export function FloatActions() {
  const mounted = useHasMounted();
  const drawerOpen = useCart((s) => s.drawerOpen);
  const [chatOpen, setChatOpen] = useState(false);
  if (mounted && drawerOpen && !chatOpen) return null;

  return (
    <>
      {!chatOpen && (
      <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col gap-3 sm:right-6 sm:bottom-6">
        <CallLink className="pointer-events-auto grid size-14 place-items-center rounded-full bg-elevated text-fg shadow-[var(--shadow-card)] ring-1 ring-border transition-transform duration-150 hover:bg-surface active:scale-[0.96]">
          <Phone className="size-5" />
        </CallLink>
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="pointer-events-auto grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-fg shadow-[var(--shadow-card)] transition-transform duration-150 hover:bg-whatsapp-hot active:scale-[0.96]"
          aria-label="WhatsApp Chuski Dera"
        >
          <WhatsAppGlyph />
        </button>
      </div>
      )}
      <WhatsAppAgent open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
