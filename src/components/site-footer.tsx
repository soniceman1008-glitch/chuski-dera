import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { RESTAURANT } from "@/lib/menu";
import { CallLink } from "@/components/call-link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-elevated text-fg">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl tracking-wide">{RESTAURANT.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Fast food from Satellite Town. Burgers, shawarma, wraps, wings — packed hot for
            delivery across Jhang.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">Visit</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{RESTAURANT.address}</p>
          <CallLink className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-hot">
            <Phone className="size-4" />
            {RESTAURANT.callDisplay}
          </CallLink>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">Order</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Build a cart, drop your address, send it on WhatsApp. We confirm and dispatch.
          </p>
          <Link
            to="/order"
            className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg transition-transform duration-150 active:scale-[0.96]"
          >
            Checkout
          </Link>
        </div>
      </div>
    </footer>
  );
}
