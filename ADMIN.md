# Chuski Dera — Admin + Neon

Public site stays open. No login is needed to browse or order.

## 1. Neon database (required for live save)

Do this once. Do not paste the connection string into GitHub, chat, or the website.

1. Open [https://console.neon.tech](https://console.neon.tech) and sign up / sign in.
2. **New Project** → name it `chuski-dera` → region closest to you → Create.
3. On the project dashboard click **Connect**.
4. Keep **Connection pooling** ON.
5. Copy the connection string only. It looks like `postgresql://…@….neon.tech/neondb?sslmode=require`.

## 2. Put it on Vercel (secret)

1. Open [https://vercel.com/tayyab-mehmood/chuski-dera/settings/environment-variables](https://vercel.com/tayyab-mehmood/chuski-dera/settings/environment-variables)
2. Add these three keys. Environments: **Production** (and Preview if you want). Never share the values.

   | Key | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon connection string from step 1 |
   | `BETTER_AUTH_URL` | `https://chuski-dera.vercel.app` |
   | `BETTER_AUTH_SECRET` | any long random string (32+ characters) |

3. Save.
4. Deployments → latest → **Redeploy** (or wait for the next git deploy).

After redeploy the first request creates tables and seeds the menu.

## 3. Open the dashboard

Go to **/admin**. Sign up with email + password (8+ characters). The first account is the owner.

## Daily use

- **Menu** — add / edit / delete items. Price, description, image URL, availability. Uncheck **Available** to hide an item on the customer site.
- **Orders** — checkout tickets land here.
- **Customers** — search by name or phone.
- **Settings**
  - **Call** `03717400624` / `tel:+923717400624`
  - **WhatsApp** stays `0313-9235645` / `+923139235645`

If `DATABASE_URL` is missing, the site shows an error instead of a fake default menu.
