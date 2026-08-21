import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { RESTAURANT } from "@/lib/menu";
import { getPublicCatalog } from "@/lib/server/catalog";
import { subscribeCatalogSync } from "@/lib/catalog-sync";
import type { CatalogCategory, CatalogItem, RestaurantSettings } from "@/lib/types";

const waitingSettings: RestaurantSettings = {
  id: "main",
  name: RESTAURANT.name,
  logoUrl: "",
  tagline: RESTAURANT.tagline,
  address: RESTAURANT.address,
  city: RESTAURANT.city,
  hours: "12:00 PM – 12:00 AM",
  callDisplay: "03717400624",
  callTel: "+923717400624",
  waDisplay: RESTAURANT.phoneDisplay,
  waTel: RESTAURANT.phoneTel,
  mapsQuery: RESTAURANT.mapsQuery,
};

type Catalog = {
  settings: RestaurantSettings;
  categories: CatalogCategory[];
  items: CatalogItem[];
  ready: boolean;
  error: string | null;
  reload: () => void;
};

const CatalogContext = createContext<Catalog>({
  settings: waitingSettings,
  categories: [],
  items: [],
  ready: false,
  error: null,
  reload: () => {},
});

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(waitingSettings);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const onVis = () => {
      if (document.visibilityState === "visible") bump();
    };
    document.addEventListener("visibilitychange", onVis);
    const unsub = subscribeCatalogSync((msg) => {
      if (msg === "catalog") bump();
    });
    const id = window.setInterval(bump, 12000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      unsub();
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getPublicCatalog()
      .then((data) => {
        if (cancelled) return;
        setSettings(data.settings);
        setCategories(data.categories);
        setItems(data.items);
        setError(null);
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setCategories([]);
        setItems([]);
        setError(err instanceof Error ? err.message : "Could not load the kitchen menu from the database.");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const value = useMemo(
    () => ({ settings, categories, items, ready, error, reload: () => setTick((n) => n + 1) }),
    [settings, categories, items, ready, error],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function CatalogStatusBanner() {
  const { ready, error } = useCatalog();
  if (!ready) {
    return (
      <p className="border-b border-border bg-elevated px-4 py-2 text-center text-xs text-muted">
        Loading live menu…
      </p>
    );
  }
  if (!error) return null;
  return (
    <p className="border-b border-border bg-elevated px-4 py-3 text-center text-sm text-primary">
      {error}
    </p>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}

export function useRestaurant() {
  return useCatalog().settings;
}

export function usePublicMenu() {
  return useCatalog().items.filter((item) => item.available);
}
