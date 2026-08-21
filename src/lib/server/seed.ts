import type { Sql } from "@/lib/db";
import { CATEGORIES, FOOD_CATEGORIES, MENU, RESTAURANT } from "@/lib/menu";

const PHONE_DISPLAY = "+923139235645";
const PHONE_TEL = "+923139235645";

export async function seedIfEmpty(sql: Sql) {
  await sql`
    update settings
    set
      call_display = ${PHONE_DISPLAY},
      call_tel = ${PHONE_TEL},
      wa_display = ${PHONE_DISPLAY},
      wa_tel = ${PHONE_TEL},
      updated_at = now()
    where id = 'main'
  `;

  const existing = await sql<{ n: number }>`select count(*)::int as n from settings`;
  if (Number(existing[0]?.n) > 0) return;

  await sql`
    insert into settings (
      id, name, logo_url, tagline, address, city, hours,
      call_display, call_tel, wa_display, wa_tel, maps_query
    ) values (
      'main',
      ${RESTAURANT.name},
      '',
      ${RESTAURANT.tagline},
      ${RESTAURANT.address},
      ${RESTAURANT.city},
      ${"12:00 PM – 12:00 AM"},
      ${PHONE_DISPLAY},
      ${PHONE_TEL},
      ${PHONE_DISPLAY},
      ${PHONE_TEL},
      ${RESTAURANT.mapsQuery}
    )
    on conflict (id) do nothing
  `;

  let sort = 0;
  for (const cat of CATEGORIES) {
    if (cat.id === "all") continue;
    sort += 1;
    const isFood = (FOOD_CATEGORIES as string[]).includes(cat.id);
    await sql`
      insert into categories (id, label, sort_order, is_food)
      values (${cat.id}, ${cat.label}, ${sort}, ${isFood})
      on conflict (id) do nothing
    `;
  }

  let itemSort = 0;
  for (const item of MENU) {
    itemSort += 1;
    await sql`
      insert into menu_items (
        id, name, blurb, price, category_id, image, featured, promo, available, sort_order
      ) values (
        ${item.id},
        ${item.name},
        ${item.blurb},
        ${item.price},
        ${item.category},
        ${item.image},
        ${Boolean(item.featured)},
        ${Boolean(item.promo)},
        ${true},
        ${itemSort}
      )
      on conflict (id) do nothing
    `;
  }
}
