import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Phone, Bike } from "lucide-react";
import { MenuGrid } from "@/components/menu-grid";
import { FoodCard } from "@/components/food-card";
import { CallLink } from "@/components/call-link";
import { DealCard } from "@/components/deal-card";
import { FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";
import { itemCount, useCart } from "@/lib/cart-store";
import { useCatalog } from "@/lib/catalog-store";
import { useHasMounted } from "@/lib/use-has-mounted";

/** Canonical public display — never use DB for this string (avoids stale +923139235645). */
const CALL_DISPLAY = "0313-9235654";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { items: catalogItems } = useCatalog();
  const featured = catalogItems.filter(
    (item) => item.available && item.featured && FOOD_CATEGORIES.includes(item.category as (typeof FOOD_CATEGORIES)[number]),
  );
  const promos = catalogItems.filter((item) => item.available && item.promo);
  const catalogDeals = catalogItems.filter((item) => item.available && item.category === "deals");
  const deals = catalogDeals.length ? catalogDeals : MENU.filter((item) => item.category === "deals");
  const lines = useCart((s) => s.lines);
  const setDrawerOpen = useCart((s) => s.setDrawerOpen);
  const mounted = useHasMounted();
  const count = mounted ? itemCount(lines) : 0;

  function orderNow() {
    if (count > 0) {
      setDrawerOpen(true);
      return;
    }
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(RESTAURANT.mapsQuery)}`;

  return (
    <main>
      <section className="relative isolate min-h-[78dvh] overflow-hidden bg-bg">
        <img
          src="/images/hero.jpg"
          alt="Burgers, shawarma, fries and wings from Chuski Dera"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/25" />
        <div className="relative mx-auto flex min-h-[78dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <div className="stagger-in max-w-xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
              Satellite Town · Jhang
            </p>
            <h1 className="mt-3 font-display text-6xl leading-[0.9] tracking-wide sm:text-7xl md:text-8xl">
              Chuski
              <br />
              Dera.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-fg/80 sm:text-lg">
              Burgers, shawarma, paratha rolls and loaded fries — fried hot, packed, and sent
              across Jhang.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={orderNow}
                className="inline-flex h-12 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]"
              >
                Order now
              </button>
              <a
                href="#menu"
                className="inline-flex h-12 items-center gap-2 rounded-lg px-5 text-sm font-medium text-fg ring-1 ring-fg/25 transition-colors hover:bg-fg/10"
              >
                See the menu
                <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6">
          <div className="flex gap-3">
            <Bike className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">Home delivery</p>
              <p className="mt-1 text-sm text-muted">Jhang city — call or WhatsApp the cart.</p>
            </div>
          </div>
          <CallLink className="flex gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <Phone className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">{CALL_DISPLAY}</p>
              <p className="mt-1 text-sm text-muted">Tap to call. One tap on your phone.</p>
            </div>
          </CallLink>
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="font-medium">Green Belt</p>
              <p className="mt-1 text-sm text-muted">Satellite Town B Block.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
              Popular
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
              What Jhang orders.
            </h2>
          </div>
          <a
            href="#menu"
            className="hidden text-sm text-muted underline-offset-4 hover:text-fg hover:underline sm:inline"
          >
            Full menu
          </a>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.slice(0, 6).map((item) => (
            <li key={item.id}>
              <FoodCard item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section id="deals" className="border-t border-border bg-elevated/40 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Fast food deals
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
            Deals for one, two, or the whole table.
          </h2>
          <p className="mt-3 max-w-lg text-muted">
            Bundle price is fixed. Add the deal as one item — checkout totals use that Rs. amount.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((item) => (
              <li key={item.id}>
                <DealCard item={item} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
          Cafe board
        </p>
        <h2 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
          Juices, shakes, cold coffee.
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {promos.map((item) => (
            <li key={item.id}>
              <FoodCard item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section
        id="menu"
        className="border-t border-border bg-elevated/40 px-4 py-16 pb-24 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">Menu</p>
          <h2 className="mt-2 font-display text-4xl tracking-wide sm:text-5xl">
            Burgers to loaded fries. Juices to frappuccino.
          </h2>
          <p className="mt-3 max-w-lg text-muted">
            Search, filter, add. Checkout sends a clean WhatsApp ticket to the kitchen.
          </p>
          <div className="mt-10">
            <MenuGrid />
          </div>
        </div>
      </section>

      <section id="visit" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] md:grid-cols-2">
          <div className="min-h-64 bg-elevated md:min-h-[28rem]">
            <img
              src="/images/hero.jpg"
              alt="Chuski Dera food"
              className="size-full min-h-64 object-cover md:min-h-[28rem]"
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10">
            <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
              Find us
            </p>
            <h2 className="mt-2 font-display text-4xl tracking-wide">Green Belt, Jhang</h2>
            <p className="mt-3 text-muted">{RESTAURANT.address}</p>
            <CallLink className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]">
              <Phone className="size-4" />
              {CALL_DISPLAY}
            </CallLink>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-12 w-fit items-center rounded-lg px-5 text-sm font-medium text-fg ring-1 ring-border transition-colors hover:bg-elevated"
            >
              Open in Google Maps
            </a>
            <Link
              to="/order"
              className="mt-3 inline-flex h-12 w-fit items-center rounded-lg px-5 text-sm font-medium text-fg ring-1 ring-border transition-colors hover:bg-elevated"
            >
              Checkout for delivery
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
