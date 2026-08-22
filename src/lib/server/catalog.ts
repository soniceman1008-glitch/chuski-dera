import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { seedIfEmpty } from "./seed";
import { requireStaff } from "./staff";
import { fileCatalog } from "./file-catalog";
import type { CatalogCategory, CatalogItem, RestaurantSettings } from "@/lib/types";
import {
  sanitizeCallDisplay,
  sanitizeCallTel,
  sanitizeWaDisplay,
  sanitizeWaTel,
} from "@/lib/phone";

function num(v: unknown) {
  return typeof v === "number" ? v : Number(v);
}

function mapSettings(row: Record<string, unknown>): RestaurantSettings {
  return {
    id: String(row.id ?? "main"),
    name: String(row.name ?? "Chuski Dera"),
    logoUrl: String(row.logo_url ?? ""),
    tagline: String(row.tagline ?? ""),
    address: String(row.address ?? ""),
    city: String(row.city ?? ""),
    hours: String(row.hours ?? ""),
    callDisplay: sanitizeCallDisplay(String(row.call_display ?? "")),
    callTel: sanitizeCallTel(String(row.call_tel ?? "")),
    waDisplay: sanitizeWaDisplay(String(row.wa_display ?? "")),
    waTel: sanitizeWaTel(String(row.wa_tel ?? "")),
    mapsQuery: String(row.maps_query ?? ""),
  };
}

function mapItem(row: Record<string, unknown>): CatalogItem {
  return {
    id: String(row.id),
    name: String(row.name),
    blurb: String(row.blurb ?? ""),
    price: num(row.price),
    category: String(row.category_id),
    image: String(row.image ?? ""),
    featured: Boolean(row.featured),
    promo: Boolean(row.promo),
    available: Boolean(row.available),
    sortOrder: num(row.sort_order),
  };
}

function mapCat(row: Record<string, unknown>): CatalogCategory {
  return {
    id: String(row.id),
    label: String(row.label),
    sortOrder: num(row.sort_order),
    isFood: Boolean(row.is_food),
  };
}

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const sql = await getSql();
    await seedIfEmpty(sql);
    const settingsRows = await sql<Record<string, unknown>>`select * from settings where id = ${"main"}`;
    const cats = await sql<Record<string, unknown>>`select * from categories order by sort_order, label`;
    const items = await sql<Record<string, unknown>>`
      select * from menu_items where available = true order by sort_order, name
    `;
    if (!items.length) return fileCatalog(false);
    return {
      settings: mapSettings(settingsRows[0] ?? {}),
      categories: cats.map(mapCat),
      items: items.map(mapItem),
    };
  } catch {
    return fileCatalog(false);
  }
});

export const getAdminCatalog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    try {
      const sql = await getSql();
      await seedIfEmpty(sql);
      const settingsRows = await sql<Record<string, unknown>>`select * from settings where id = ${"main"}`;
      const cats = await sql<Record<string, unknown>>`select * from categories order by sort_order, label`;
      const items = await sql<Record<string, unknown>>`select * from menu_items order by sort_order, name`;
      return {
        settings: mapSettings(settingsRows[0] ?? {}),
        categories: cats.map(mapCat),
        items: items.map(mapItem),
      };
    } catch {
      return fileCatalog(true);
    }
  });

const ItemSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  name: z.string().min(1).max(80),
  blurb: z.string().max(200).optional().default(""),
  price: z.number().int().min(0).max(100000),
  category: z.string().min(1).max(80),
  image: z.string().max(2_000_000).optional().default(""),
  featured: z.boolean().optional().default(false),
  promo: z.boolean().optional().default(false),
  available: z.boolean().optional().default(true),
});

function slug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || `item-${Date.now()}`
  );
}

export const saveMenuItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => ItemSchema.parse(d))
  .handler(async ({ context, data }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const id = data.id?.trim() || slug(data.name);
    const existing = await sql<{ id: string }>`select id from menu_items where id = ${id}`;
    if (existing[0]) {
      await sql`
        update menu_items set
          name = ${data.name.trim()},
          blurb = ${data.blurb ?? ""},
          price = ${data.price},
          category_id = ${data.category},
          image = ${data.image ?? ""},
          featured = ${data.featured ?? false},
          promo = ${data.promo ?? false},
          available = ${data.available ?? true}
        where id = ${id}
      `;
    } else {
      const max = await sql<{ n: number }>`select coalesce(max(sort_order),0)::int as n from menu_items`;
      await sql`
        insert into menu_items (
          id, name, blurb, price, category_id, image, featured, promo, available, sort_order
        ) values (
          ${id}, ${data.name.trim()}, ${data.blurb ?? ""}, ${data.price}, ${data.category},
          ${data.image ?? ""}, ${data.featured ?? false}, ${data.promo ?? false},
          ${data.available ?? true}, ${Number(max[0]?.n) + 1}
        )
      `;
    }
    return { id };
  });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`delete from menu_items where id = ${data.id}`;
    return { ok: true };
  });

const CatSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  label: z.string().min(1).max(60),
  isFood: z.boolean().optional().default(false),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => CatSchema.parse(d))
  .handler(async ({ context, data }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const id = data.id?.trim() || slug(data.label);
    const existing = await sql<{ id: string }>`select id from categories where id = ${id}`;
    if (existing[0]) {
      await sql`update categories set label = ${data.label.trim()}, is_food = ${data.isFood ?? false} where id = ${id}`;
    } else {
      const max = await sql<{ n: number }>`select coalesce(max(sort_order),0)::int as n from categories`;
      await sql`
        insert into categories (id, label, sort_order, is_food)
        values (${id}, ${data.label.trim()}, ${Number(max[0]?.n) + 1}, ${data.isFood ?? false})
      `;
    }
    return { id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    const used = await sql<{ n: number }>`select count(*)::int as n from menu_items where category_id = ${data.id}`;
    if (Number(used[0]?.n) > 0) throw new Error("Move or delete items in this category first.");
    await sql`delete from categories where id = ${data.id}`;
    return { ok: true };
  });

const SettingsSchema = z.object({
  name: z.string().min(1).max(80),
  logoUrl: z.string().max(2_000_000).optional().default(""),
  tagline: z.string().max(120).optional().default(""),
  address: z.string().min(1).max(200),
  city: z.string().min(1).max(80),
  hours: z.string().max(80).optional().default(""),
  callDisplay: z.string().min(1).max(30),
  callTel: z.string().min(1).max(30),
  waDisplay: z.string().min(1).max(30),
  waTel: z.string().min(1).max(30),
  mapsQuery: z.string().min(1).max(200),
});

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: unknown) => SettingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    if (!(await requireStaff(context.userId))) throw new Error("Forbidden");
    const sql = await getSql();
    await sql`
      update settings set
        name = ${data.name.trim()},
        logo_url = ${data.logoUrl ?? ""},
        tagline = ${data.tagline ?? ""},
        address = ${data.address.trim()},
        city = ${data.city.trim()},
        hours = ${data.hours ?? ""},
        call_display = ${sanitizeCallDisplay(data.callDisplay)},
        call_tel = ${sanitizeCallTel(data.callTel)},
        wa_display = ${sanitizeWaDisplay(data.waDisplay)},
        wa_tel = ${sanitizeWaTel(data.waTel)},
        maps_query = ${data.mapsQuery.trim()},
        updated_at = now()
      where id = ${"main"}
    `;
    return { ok: true };
  });
