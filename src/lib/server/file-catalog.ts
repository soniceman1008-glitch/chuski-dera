import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES, FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";
import type { CatalogCategory, CatalogItem, RestaurantSettings } from "@/lib/types";

type Store = { items: CatalogItem[] };

const g = globalThis as typeof globalThis & { __chuskiFileCatalog__?: Store };

function defaultItems(): CatalogItem[] {
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

function store(): Store {
  if (!g.__chuskiFileCatalog__) {
    g.__chuskiFileCatalog__ = { items: defaultItems() };
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
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) ||
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

async function mirrorSaveToDb(row: CatalogItem) {
  try {
    const { databaseConfigured, getSql } = await import("@/lib/db");
    if (!databaseConfigured) return;
    const sql = await getSql();
    const existing = await sql<{ id: string }>`select id from menu_items where id = ${row.id}`;
    if (existing[0]) {
      await sql`
        update menu_items set
          name = ${row.name},
          blurb = ${row.blurb},
          price = ${row.price},
          category_id = ${row.category},
          image = ${row.image},
          featured = ${row.featured},
          promo = ${row.promo},
          available = ${row.available}
        where id = ${row.id}
      `;
    } else {
      const max = await sql<{ n: number }>`select coalesce(max(sort_order),0)::int as n from menu_items`;
      await sql`
        insert into menu_items (
          id, name, blurb, price, category_id, image, featured, promo, available, sort_order
        ) values (
          ${row.id}, ${row.name}, ${row.blurb}, ${row.price}, ${row.category},
          ${row.image}, ${row.featured}, ${row.promo}, ${row.available}, ${Number(max[0]?.n) + 1}
        )
      `;
    }
  } catch {
    /* ignore */
  }
}

async function mirrorDeleteToDb(id: string) {
  try {
    const { databaseConfigured, getSql } = await import("@/lib/db");
    if (!databaseConfigured) return;
    const sql = await getSql();
    await sql`delete from menu_items where id = ${id}`;
  } catch {
    /* ignore */
  }
}

export const getFileAdminCatalog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { databaseConfigured, getSql } = await import("@/lib/db");
    if (databaseConfigured) {
      const sql = await getSql();
      const cats = await sql<Record<string, unknown>>`select * from categories order by sort_order, label`;
      const items = await sql<Record<string, unknown>>`select * from menu_items order by sort_order, name`;
      if (items.length) {
        return {
          settings: fileSettings(),
          categories: cats.map((row) => ({
            id: String(row.id),
            label: String(row.label),
            sortOrder: Number(row.sort_order) || 0,
            isFood: Boolean(row.is_food),
          })),
          items: items.map((row) => ({
            id: String(row.id),
            name: String(row.name),
            blurb: String(row.blurb ?? ""),
            price: Number(row.price),
            category: String(row.category_id),
            image: String(row.image ?? ""),
            featured: Boolean(row.featured),
            promo: Boolean(row.promo),
            available: Boolean(row.available),
            sortOrder: Number(row.sort_order) || 0,
          })),
        };
      }
    }
  } catch {
    /* fall through */
  }
  return fileCatalog(true);
});

export const saveFileMenuItem = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(1).max(80).optional(),
        name: z.string().min(1).max(80),
        blurb: z.string().max(200).optional().default(""),
        price: z.number().int().min(0).max(100000),
        category: z.string().min(1).max(80),
        image: z.string().max(2_000_000).optional().default(""),
        featured: z.boolean().optional().default(false),
        promo: z.boolean().optional().default(false),
        available: z.boolean().optional().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const saved = fileSaveItem(data);
    const row = store().items.find((i) => i.id === saved.id);
    if (row) await mirrorSaveToDb(row);
    return saved;
  });

export const deleteFileMenuItem = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const result = fileDeleteItem(data.id);
    await mirrorDeleteToDb(data.id);
    return result;
  });
