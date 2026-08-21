import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES, MENU, categoryLabel, type CategoryId } from "@/lib/menu";
import { FoodCard } from "@/components/food-card";

export function MenuGrid() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MENU.filter((item) => {
      if (cat !== "all" && item.category !== cat) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) || item.blurb.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  const groups = useMemo(() => {
    if (cat !== "all") {
      return [{ id: cat, label: categoryLabel(cat), items }];
    }
    return CATEGORIES.filter((c) => c.id !== "all")
      .map((c) => ({
        id: c.id,
        label: c.label,
        items: items.filter((item) => item.category === c.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [cat, items]);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search burgers, shakes, juices…"
            className="h-12 w-full rounded-lg bg-surface pr-3 pl-10 text-sm text-fg shadow-[var(--shadow-card)] outline-none placeholder:text-subtle focus:ring-2 focus:ring-primary/50"
            aria-label="Search menu"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {CATEGORIES.map((c) => {
            const active = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={
                  active
                    ? "h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-fg"
                    : "h-11 shrink-0 rounded-full bg-surface px-4 text-sm font-medium text-muted ring-1 ring-border transition-colors hover:text-fg"
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          Nothing matches “{query}”. Try mango, zinger, or lime.
        </p>
      ) : (
        <div className="mt-8 space-y-12">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`cat-${group.id}`}>
              {cat === "all" && (
                <h3
                  id={`cat-${group.id}`}
                  className="font-display text-3xl tracking-wide text-fg"
                >
                  {group.label}
                </h3>
              )}
              <ul className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${cat === "all" ? "mt-5" : ""}`}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <FoodCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
