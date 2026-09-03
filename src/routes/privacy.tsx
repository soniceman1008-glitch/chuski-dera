import { createFileRoute, Link } from "@tanstack/react-router";
import { RESTAURANT } from "@/lib/menu";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">Legal</p>
      <h1 className="mt-2 font-display text-4xl tracking-wide">Privacy</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        {RESTAURANT.name} takes orders over this website and WhatsApp. We collect only what is
        needed to prepare and deliver your food: name, phone number, and delivery address.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
        <li>Cart contents stay on your device until you place an order.</li>
        <li>Placed orders are stored so the kitchen can prepare and contact you.</li>
        <li>We do not take card payments on this site.</li>
        <li>We do not sell customer data.</li>
        <li>
          Call or WhatsApp {RESTAURANT.phoneDisplay} to update or remove your details.
        </li>
      </ul>
      <Link to="/" className="mt-10 inline-flex h-11 items-center text-sm text-primary">
        Back to menu
      </Link>
    </main>
  );
}
