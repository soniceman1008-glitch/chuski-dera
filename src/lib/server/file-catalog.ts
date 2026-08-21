import { CATEGORIES, FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";
import type { CatalogCategory, CatalogItem, RestaurantSettings } from "@/lib/types";

type Store = { items: CatalogItem[] };

const g = globalThis as typeof globalThis & { __chuskiFileCatalog__?: Store };

function store(): Store {
  if (!g.__chuskiFileCatalog__) {
    g.__chuskiFileCatalog__ = {
      items: MENU.map((item, i) => ({
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
      })),
    };
  }
  return g.__chuskiFileCatalog__;
}

export function fileSettings(): RestaurantSettings {
  return {
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
}

export function fileCategories(): CatalogCategory[] {
  return CATEGORIES.filter((c) => c.id !== "all").map((c, i) => ({
    id: c.id,
    label: c.label,
    sortOrder: i,
    isFood: FOOD_CATEGORIES.includes(c.id as (typeof FOOD_CATEGORIES)[number]),
  }));
}

export function fileCatalog(admin = false) {
  const items = store().items.filter((item) => admin || item.available);
  return { settings: fileSettings(), categories: fileCategories(), items };
}

export function fileSaveItem(data: {
  id?: string;
  name: string;
  blurb?: string;
  price: number;
  category: string;
  image?: string;
  featured?: boolean;
  promo?: boolean;
  available?: boolean;
}) {
  const items = store().items;
  const id =
    data.id?.trim() ||
    data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) ||
    `item-${Date.now()}`;
  const next: CatalogItem = {
    id,
    name: data.name.trim(),
    blurb: data.blurb ?? "",
    price: data.price,
    category: data.category,
    image: data.image ?? "",
    featured: Boolean(data.featured),
    promo: Boolean(data.promo),
    available: data.available !== false,
    sortOrder: items.find((row) => row.id === id)?.sortOrder ?? items.length + 1,
  };
  const idx = items.findIndex((row) => row.id === id);
  if (idx >= 0) items[idx] = next;
  else items.push(next);
  return { id };
}

export function fileDeleteItem(id: string) {
  const items = store().items;
  const idx = items.findIndex((row) => row.id === id);
  if (idx >= 0) items.splice(idx, 1);
  return { ok: true };
}
