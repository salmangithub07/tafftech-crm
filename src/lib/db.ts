import { Pool, types } from "pg";

// Return DATE / TIMESTAMP columns as plain strings (e.g. "2026-07-21",
// "2026-07-21 10:00:00") instead of JS Date objects — the rest of the app
// (search, CSV export, date-filter comparisons, etc.) expects strings.
types.setTypeParser(1082, (val) => val); // date
types.setTypeParser(1114, (val) => val); // timestamp without time zone
types.setTypeParser(1184, (val) => val); // timestamp with time zone
types.setTypeParser(1083, (val) => val); // time

declare global {
  var __crmPool: Pool | undefined;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  "postgres://invalid:invalid@localhost:5432/not_configured";

// Neon (and most managed Postgres) require SSL. Local development against a
// plain `postgres://localhost` connection typically does not use/need it.
const needsSsl = /sslmode=require|neon\.tech|supabase\.co/.test(connectionString);

const pool =
  global.__crmPool ??
  new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    // Serverless-friendly settings: each Vercel function instance mostly
    // handles one request at a time, so a small pool per instance is enough
    // — a large `max` here just multiplies against however many concurrent
    // function instances Vercel spins up, and can exhaust a free-tier
    // Postgres connection limit fast. Use Neon's *pooled* connection string
    // (the one with "-pooler" in the hostname) in production so Neon's own
    // PgBouncer absorbs the fan-out from many function instances.
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

if (process.env.NODE_ENV !== "production") global.__crmPool = pool;

/** Converts the MySQL-style `?` placeholders used throughout this app into Postgres `$1, $2, ...`. */
function toPositional(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Run a SELECT and get back an array of rows. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query(toPositional(sql), params);
  return result.rows as T[];
}

/** Run a SELECT and get back the first row, or null. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export type ExecuteResult = {
  insertId: number;
  affectedRows: number;
};

/**
 * Run an INSERT/UPDATE/DELETE. Mirrors the shape the app previously got from
 * mysql2 (`result.insertId`, `result.affectedRows`) so route handlers didn't
 * need to change. Every table's primary key is `id`, so for INSERT statements
 * that don't already have a RETURNING clause, one is added automatically.
 */
export async function execute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
  const isInsert = /^\s*insert/i.test(sql);
  const hasReturning = /returning/i.test(sql);
  const finalSql = isInsert && !hasReturning ? `${sql} RETURNING id` : sql;

  const result = await pool.query(toPositional(finalSql), params);
  const insertId = isInsert ? Number((result.rows[0] as { id?: number } | undefined)?.id ?? 0) : 0;

  return { insertId, affectedRows: result.rowCount ?? 0 };
}

export default pool;
