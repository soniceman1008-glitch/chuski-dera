import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CATEGORIES, FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";
import { getPublicCatalog } from "@/lib/server/catalog";
import { subscribeCatalogSync } from "@/lib/catalog-sync";
import type { CatalogCategory, CatalogItem, RestaurantSettings } from "@/lib/types";

const defaultSettings: RestaurantSettings = {
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

const defaultCategories: CatalogCategory[] = CATEGORIES.filter((c) => c.id !== "all").map(
  (c, i) => ({
    id: c.id,
    label: c.label,
    sortOrder: i + 1,
    isFood: (FOOD_CATEGORIES as string[]).includes(c.id),
  }),
);

const defaultItems: CatalogItem[] = MENU.map((item, i) => ({
  ...item,
  category: item.category,
  available: true,
  featured: Boolean(item.featured),
  promo: Boolean(item.promo),
  sortOrder: i + 1,
}));

type Catalog = {
  settings: RestaurantSettings;
  categories: CatalogCategory[];
  items: CatalogItem[];
  ready: boolean;
  reload: () => void;
};

const CatalogContext = createContext<Catalog>({
  settings: defaultSettings,
  categories: defaultCategories,
  items: defaultItems,
  ready: false,
  reload: () => {},
});

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [categories, setCategories] = useState(defaultCategories);
  const [items, setItems] = useState(defaultItems);
  const [ready, setReady] = useState(false);
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
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const value = useMemo(
    () => ({ settings, categories, items, ready, reload: () => setTick((n) => n + 1) }),
    [settings, categories, items, ready],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
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
