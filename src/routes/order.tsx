import { createFileRoute } from "@tanstack/react-router";
import { CheckoutForm } from "@/components/checkout-form";

export const Route = createFileRoute("/order")({ component: OrderPage });

function OrderPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">Checkout</p>
      <h1 className="mt-2 font-display text-5xl tracking-wide sm:text-6xl">Send the order.</h1>
      <p className="mt-3 max-w-xl text-muted">
        Confirm items, add your name, phone and address. WhatsApp carries the ticket to Chuski
        Dera — no online payment here.
      </p>
      <div className="mt-10">
        <CheckoutForm />
      </div>
    </main>
  );
}
