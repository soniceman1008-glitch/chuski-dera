#!/usr/bin/env node
/**
 * Optional migrator for a real Postgres DATABASE_URL (Neon).
 *
 * Production schema is also applied at runtime in src/lib/db.ts. This script is
 * for local/CI use. It never falls back to localhost.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.mjs";

function readDatabaseUrl() {
  const raw = process.env["DATABASE_URL"];
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  return trimmed ? trimmed : undefined;
}

function hostnameOf(databaseUrl) {
  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isLocalHost(host) {
  return !host || host === "localhost" || host === "127.0.0.1" || host === "::1";
}

const onVercel = Boolean(process.env["VERCEL"] || process.env["VERCEL_ENV"]);
const databaseUrl = readDatabaseUrl();

if (!databaseUrl) {
  if (onVercel) {
    console.error(
      "[migrate] DATABASE_URL is missing. Add the Neon connection string in Vercel → Settings → Environment Variables, then redeploy.",
    );
    process.exit(1);
  }
  console.log("[migrate] DATABASE_URL not set — skipping.");
  process.exit(0);
}

const host = hostnameOf(databaseUrl);
if (isLocalHost(host)) {
  console.error(
    "[migrate] DATABASE_URL host is localhost / 127.0.0.1. That cannot work on Vercel. Use the Neon pooled string from console.neon.tech (host ends with neon.tech). If the password contains @ : / #, URL-encode those characters.",
  );
  process.exit(1);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          /* keep original */
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
