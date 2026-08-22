import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CATEGORIES, FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";
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
  callDisplay: RESTAURANT.callDisplay,
  callTel: RESTAURANT.callTel,
  waDisplay: RESTAURANT.phoneDisplay,
  waTel: RESTAURANT.phoneTel,
  mapsQuery: RESTAURANT.mapsQuery,
};

function staticItems(): CatalogItem[] {
  return MENU.map((item, i) => ({
    id: item.id,
    name: item.name,
    blurb: item.blurb,
    price: item.price,
    category: item.category,
    image: item.image,
    featured: Boolean(item.featured),
    promo: Boolean(item.promo),
    available: true,
    sortOrder: i,
  }));
}

function staticCategories(): CatalogCategory[] {
  return CATEGORIES.filter((c) => c.id !== "all").map((c, i) => ({
    id: c.id,
    label: c.label,
    sortOrder: i,
    isFood: FOOD_CATEGORIES.includes(c.id as (typeof FOOD_CATEGORIES)[number]),
  }));
}

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
  const [settings] = useState(waitingSettings);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const unsub = subscribeCatalogSync((msg) => {
      if (msg === "catalog") bump();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setCategories(staticCategories());
    setItems(staticItems());
    setReady(true);
  }, [tick]);

  const value = useMemo(
    () => ({ settings, categories, items, ready, error, reload: () => setTick((n) => n + 1) }),
    [settings, categories, items, ready, error],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function CatalogStatusBanner() {
  return null;
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
