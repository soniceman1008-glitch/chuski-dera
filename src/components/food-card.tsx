import { formatRs, type MenuItem } from "@/lib/menu";
import { qtyOf, useCart } from "@/lib/cart-store";
import { QtyStepper } from "@/components/qty-stepper";
import { useHasMounted } from "@/lib/use-has-mounted";
import { playChoiceVoice } from "@/lib/choice-voice";

export function FoodCard({ item }: { item: MenuItem }) {
  const mounted = useHasMounted();
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const qty = mounted ? qtyOf(lines, item.id) : 0;

  function choose() {
    playChoiceVoice();
    add(item.id);
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={choose}
        className="aspect-[4/3] w-full cursor-pointer overflow-hidden border-0 bg-elevated p-0 text-left"
        aria-label={`Add ${item.name} to cart`}
      >
        <picture>
          <source type="image/webp" srcSet={item.image.replace(/\.jpe?g$/i, ".webp")} />
          <img
            src={item.image}
            alt={item.name}
            width={800}
            height={600}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-[var(--ease-smooth-out)] group-hover:scale-[1.04]"
          />
        </picture>
      </button>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium leading-snug">{item.name}</h3>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-primary">
              {formatRs(item.price)}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">{item.blurb}</p>
        </div>
        {qty > 0 ? (
          <QtyStepper
            qty={qty}
            label={item.name}
            wide
            onDec={() => setQty(item.id, qty - 1)}
            onInc={choose}
          />
        ) : (
          <button
            type="button"
            onClick={choose}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-fg transition-transform duration-150 hover:bg-primary-hot active:scale-[0.96]"
          >
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}
