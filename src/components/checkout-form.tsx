import { useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { formatRs } from "@/lib/menu";
import { cartTotal, itemCount, resolveCartItem, useCart } from "@/lib/cart-store";
import { whatsappOrderHref } from "@/lib/whatsapp";
import { QtyStepper } from "@/components/qty-stepper";
import { OrderConfirmModal } from "@/components/order-confirm-modal";
import { playOrderClip, stopOrderClip } from "@/lib/choice-voice";
import { useHasMounted } from "@/lib/use-has-mounted";
import { placeOrder } from "@/lib/server/orders";
import { notifyOrdersChanged } from "@/lib/catalog-sync";
import { usePublicMenu } from "@/lib/catalog-store";

export function CheckoutForm() {
  const mounted = useHasMounted();
  const catalog = usePublicMenu();
  const lines = useCart((s) => s.lines);
  const customer = useCart((s) => s.customer);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const setCustomer = useCart((s) => s.setCustomer);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<"ask" | "done">("ask");
  const [waReady, setWaReady] = useState(false);
  const [waOpened, setWaOpened] = useState(false);
  const waHrefRef = useRef("");
  const waSentRef = useRef(false);

  const visible = mounted ? lines : [];
  const info = mounted ? customer : { name: "", phone: "", address: "" };
  const total = cartTotal(visible, catalog);
  const count = itemCount(visible);

  function openWhatsApp() {
    if (waSentRef.current || !waHrefRef.current) return;
    const popup = window.open(waHrefRef.current, "_blank", "noopener,noreferrer");
    if (!popup) {
      setWaReady(true);
      return;
    }
    waSentRef.current = true;
    setWaOpened(true);
    setWaReady(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!visible.length) {
      setError("Add something from the menu first.");
      return;
    }
    if (!info.name.trim() || !info.phone.trim() || !info.address.trim()) {
      setError("Name, phone and delivery address are required.");
      return;
    }
    setError("");
    waSentRef.current = false;
    waHrefRef.current = "";
    setWaReady(false);
    setWaOpened(false);
    setPhase("ask");
    setConfirmOpen(true);
    playOrderClip("/audio/confirm-ask.mp3?v=en-short");
  }

  function onConfirm() {
    const snapshotLines = visible.map((line) => ({ ...line }));
    const snapshotCustomer = {
      name: info.name,
      phone: info.phone,
      address: info.address,
    };
    waSentRef.current = false;
    waHrefRef.current = whatsappOrderHref(snapshotLines, snapshotCustomer, new Date(), catalog);
    setWaReady(false);
    setWaOpened(false);
    setPhase("done");
    void placeOrder({
      data: {
        name: snapshotCustomer.name,
        phone: snapshotCustomer.phone,
        address: snapshotCustomer.address,
        lines: snapshotLines,
      },
    })
      .then(() => notifyOrdersChanged())
      .catch(() => {
        /* WhatsApp ticket still goes out */
      });
    playOrderClip("/audio/confirm-ok.mp3?v=thanks", () => {
      openWhatsApp();
    });
  }

  function onOpenWhatsApp() {
    openWhatsApp();
  }

  function closeModal() {
    if (phase === "ask") stopOrderClip();
    setConfirmOpen(false);
    setPhase("ask");
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          <h2 className="font-display text-3xl tracking-wide">Your order</h2>
          {visible.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Nothing here yet.{" "}
              <Link to="/" hash="menu" className="text-primary underline-offset-4 hover:underline">
                Browse the menu
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-border rounded-xl bg-surface px-4 shadow-[var(--shadow-card)]">
              {visible.map((line) => {
                const item = resolveCartItem(line.id, catalog);
                if (!item) return null;
                return (
                  <li key={line.id} className="flex items-center gap-3 py-4">
                    <img
                      src={item.image}
                      alt=""
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="size-14 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs tabular-nums text-muted">{formatRs(item.price)}</p>
                    </div>
                    <QtyStepper
                      qty={line.qty}
                      label={item.name}
                      onDec={() => setQty(line.id, line.qty - 1)}
                      onInc={() => add(line.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <h2 className="font-display text-3xl tracking-wide">Delivery</h2>
          <p className="mt-1 text-sm text-muted">We send this ticket on WhatsApp to confirm.</p>

          <label className="mt-5 block text-xs text-muted" htmlFor="cust-name">
            Name
          </label>
          <input
            id="cust-name"
            value={info.name}
            onChange={(e) => setCustomer({ name: e.target.value })}
            placeholder="Your name"
            className="mt-1 h-11 w-full rounded-md bg-elevated px-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/50"
          />

          <label className="mt-3 block text-xs text-muted" htmlFor="cust-phone">
            Phone
          </label>
          <input
            id="cust-phone"
            value={info.phone}
            onChange={(e) => setCustomer({ phone: e.target.value })}
            placeholder="03XX-XXXXXXX"
            inputMode="tel"
            className="mt-1 h-11 w-full rounded-md bg-elevated px-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/50"
          />

          <label className="mt-3 block text-xs text-muted" htmlFor="cust-address">
            Delivery address
          </label>
          <textarea
            id="cust-address"
            value={info.address}
            onChange={(e) => setCustomer({ address: e.target.value })}
            placeholder="House, street, Satellite Town…"
            rows={3}
            className="mt-1 w-full resize-none rounded-md bg-elevated px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/50"
          />

          <p className="mt-5 flex justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted">
              {count} {count === 1 ? "item" : "items"}
            </span>
            <span className="text-lg font-semibold tabular-nums">{formatRs(total)}</span>
          </p>

          {error && <p className="mt-3 text-sm text-primary">{error}</p>}

          <button
            type="submit"
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]"
          >
            Place order
          </button>
          <p className="mt-3 text-center text-xs text-subtle">
            Voice confirm first. Then WhatsApp carries the ticket.
          </p>
        </aside>
      </form>

      <OrderConfirmModal
        open={confirmOpen}
        phase={phase}
        waReady={waReady}
        waOpened={waOpened}
        onConfirm={onConfirm}
        onCancel={closeModal}
        onDone={closeModal}
        onOpenWhatsApp={onOpenWhatsApp}
      />
    </>
  );
}
