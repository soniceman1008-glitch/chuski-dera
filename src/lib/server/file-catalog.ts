import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CATEGORIES, FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";
import { databaseConfigured, getSql } from "@/lib/db";
import type { CatalogCategory, CatalogItem, RestaurantSettings } from "@/lib/types";

type Store = { items: CatalogItem[] };

const FILE = join(process.cwd(), "data", "catalog.json");
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

export function loadFromDisk(): CatalogItem[] | null {
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as { items?: CatalogItem[] };
    if (Array.isArray(raw?.items) && raw.items.length) return raw.items;
  } catch {
    /* missing */
  }
  return null;
}

function persist(items: CatalogItem[]) {
  try {
    mkdirSync(dirname(FILE), { recursive: true });
    writeFileSync(FILE, JSON.stringify({ items }, null, 2), "utf8");
  } catch {
    /* Vercel FS may be read-only */
  }
}

function store(): Store {
  const disk = loadFromDisk();
  if (disk) {
    g.__chuskiFileCatalog__ = { items: disk };
    return g.__chuskiFileCatalog__;
  }
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
  persist(items);
  return { id };
}

export function fileDeleteItem(id: string) {
  const items = store().items;
  const idx = items.findIndex((row) => row.id === id);
  if (idx >= 0) items.splice(idx, 1);
  persist(items);
  return { ok: true };
}

export const getFileAdminCatalog = createServerFn({ method: "GET" }).handler(async () => fileCatalog(true));

async function mirrorSaveToDb(data: {
  id: string;
  name: string;
  blurb: string;
  price: number;
  category: string;
  image: string;
  featured: boolean;
  promo: boolean;
  available: boolean;
}) {
  if (!databaseConfigured) return;
  try {
    const sql = await getSql();
    const existing = await sql<{ id: string }>`select id from menu_items where id = ${data.id}`;
    if (existing[0]) {
      await sql`
        update menu_items set
          name = ${data.name},
          blurb = ${data.blurb},
          price = ${data.price},
          category_id = ${data.category},
          image = ${data.image},
          featured = ${data.featured},
          promo = ${data.promo},
          available = ${data.available}
        where id = ${data.id}
      `;
    } else {
      const max = await sql<{ n: number }>`select coalesce(max(sort_order),0)::int as n from menu_items`;
      await sql`
        insert into menu_items (
          id, name, blurb, price, category_id, image, featured, promo, available, sort_order
        ) values (
          ${data.id}, ${data.name}, ${data.blurb}, ${data.price}, ${data.category},
          ${data.image}, ${data.featured}, ${data.promo}, ${data.available}, ${Number(max[0]?.n) + 1}
        )
      `;
    }
  } catch {
    /* DB optional */
  }
}

async function mirrorDeleteToDb(id: string) {
  if (!databaseConfigured) return;
  try {
    const sql = await getSql();
    await sql`delete from menu_items where id = ${id}`;
  } catch {
    /* DB optional */
  }
}

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
    if (row) {
      await mirrorSaveToDb({
        id: row.id,
        name: row.name,
        blurb: row.blurb,
        price: row.price,
        category: row.category,
        image: row.image,
        featured: row.featured,
        promo: row.promo,
        available: row.available,
      });
    }
    return saved;
  });

export const deleteFileMenuItem = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const result = fileDeleteItem(data.id);
    await mirrorDeleteToDb(data.id);
    return result;
  });
