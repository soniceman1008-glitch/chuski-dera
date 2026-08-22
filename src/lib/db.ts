import { pendingMigrations } from "../../scripts/migration-plan.mjs";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

export const DB_MISSING_MSG =
  "Database is not connected. Add a Neon DATABASE_URL in Vercel → Project Settings → Environment Variables, then redeploy.";

/**
 * Read process.env at RUNTIME. Do not use `process.env.NAME` dotted access —
 * Vite inlines those as `undefined` at build time, which made production think
 * it was not on Vercel and then crash while opening PGLite.
 */
function runtimeEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = proc?.env?.[name];
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}

function getDatabaseUrl(): string | undefined {
  return runtimeEnv("DATABASE_URL");
}

/** Vercel / AWS Lambda — never use the embedded PGLite file there. */
export function isServerlessRuntime(): boolean {
  return Boolean(
    runtimeEnv("VERCEL") ||
      runtimeEnv("VERCEL_ENV") ||
      runtimeEnv("AWS_LAMBDA_FUNCTION_NAME") ||
      runtimeEnv("LAMBDA_TASK_ROOT"),
  );
}

export function getDbSource(): DbSource {
  return getDatabaseUrl() ? "neon" : "pglite";
}

/** Neon when DATABASE_URL is set. PGLite is local/preview only — never on Vercel. */
export const dbSource: DbSource = getDbSource();
export const databaseConfigured = Boolean(getDatabaseUrl());

/**
 * Minimal shared SQL surface, satisfied by both Neon and PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`;
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
};

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

async function applyNeonMigrations(pool: import("pg").Pool) {
  const client = await pool.connect();
  try {
    await client.query(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const doneRows = await client.query<{ name: string }>("select name from _migrations");
    const done = doneRows.rows.map((r) => r.name);
    const migrations = import.meta.glob("/migrations/*.sql", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
      try {
        await client.query("BEGIN");
        await client.query(migrations[path]);
        await client.query("insert into _migrations (name) values ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* keep original */
        }
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const connectionString = getDatabaseUrl();
    if (!connectionString) throw new Error(DB_MISSING_MSG);
    let neonUrl = connectionString;
    try {
      const parsed = new URL(connectionString);
      parsed.searchParams.set("sslmode", "verify-full");
      neonUrl = parsed.toString();
    } catch {
      neonUrl = connectionString;
    }
    const pool = new Pool({
      connectionString: neonUrl,
      max: 4,
    });
    await applyNeonMigrations(pool);
    return toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  const migrate = async (): Promise<void> => {
    const migrations = import.meta.glob("/migrations/*.sql", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const doneRows = await pg.query<{ name: string }>("select name from _migrations");
    const done = doneRows.rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
      await pg.transaction(async (tx) => {
        await tx.exec(migrations[path]);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined)
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  return toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  if (!getDatabaseUrl() && isServerlessRuntime()) {
    throw new Error(DB_MISSING_MSG);
  }
  return getDbSource() === "neon" ? createNeonSql() : createPgliteSql();
}

export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null;
    throw err;
  });
  return sqlPromise;
}

export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (isServerlessRuntime()) {
    throw new Error(DB_MISSING_MSG);
  }
  if (getDbSource() !== "pglite") {
    throw new Error("getPglite() is only available on the PGLite fallback (no DATABASE_URL)");
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

export function ensureDbReady(): Promise<void> {
  if (isServerlessRuntime() || getDbSource() !== "pglite") return Promise.resolve();
  return getSql().then(() => undefined);
}

const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined" && getDbSource() === "pglite" && !isServerlessRuntime()) {
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("[db] PGLite bootstrap failed:", err);
    throw err;
  });
}
