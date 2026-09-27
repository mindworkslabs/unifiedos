import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { max: 5, prepare: false });
    return drizzle(client, { schema }) as unknown as DB;
  }
  // Local development: an embedded Postgres (PGlite) stored on disk, migrated automatically.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".pglite");
  const client = new PGlite(dataDir === ":memory:" ? undefined : dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

const globalForDb = globalThis as unknown as { __uosDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  globalForDb.__uosDb ??= connect();
  return globalForDb.__uosDb;
}

export { schema };
