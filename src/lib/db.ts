import "server-only";

import sql from "mssql";

/**
 * Direct SQL Server access for the dashboard's read paths.
 *
 * WHY THIS EXISTS ALONGSIDE THE REST API
 * The .NET API's analytics endpoints call the Meta Graph API live, which costs
 * roughly a second each and burns rate limit. Everything they return for a
 * *historical* view is already in this database, put there by the nightly ingestion
 * and by webhooks, so reading it here is an indexed seek instead.
 *
 * WHAT MUST NOT COME FROM HERE
 * Anything needing Meta: publishing, comment moderation, and any figure newer than
 * the last ingestion. Those go through the .NET API, which owns the encrypted page
 * tokens. This module is READS ONLY, enforced in `query`.
 *
 * `server-only` is load-bearing: importing this from a client component becomes a
 * build error rather than an attempt to ship credentials to a browser. The
 * credentials are unprefixed env vars, which Next refuses to inline for the same
 * reason.
 *
 * NOTE: next.config.ts lists "mssql" in serverExternalPackages. Bundling it breaks
 * parameterised queries — see the comment there before removing it.
 */

const config: sql.config = {
  server: process.env.FB_DB_SERVER ?? "",
  port: Number(process.env.FB_DB_PORT ?? 1433),
  database: process.env.FB_DB_NAME,
  user: process.env.FB_DB_USER,
  password: process.env.FB_DB_PASSWORD,
  options: {
    // The host presents a self-signed certificate; the traffic is still encrypted,
    // the trust flag only skips chain validation.
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    // Modest on purpose. This is a shared-hosting database with a connection cap,
    // and a dashboard's reads are short; a large pool mostly buys a way to hit that
    // cap during a hot-reload storm.
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

/**
 * One pool per process, cached on globalThis.
 *
 * Next re-evaluates modules on every hot reload. A module-level variable would build
 * a fresh pool per edit and leak the previous ones until the server refused more
 * connections.
 */
declare global {
  var __fbSqlPool: Promise<sql.ConnectionPool> | undefined;
}

function createPool(): Promise<sql.ConnectionPool> {
  if (!config.server) {
    return Promise.reject(
      new Error(
        "FB_DB_SERVER is not set. Add the database settings to .env.local — see src/lib/db.ts."
      )
    );
  }

  return new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      // A failed pool is not reusable, so drop the cached promise and let the next
      // caller build a fresh one rather than serving a dead handle forever.
      pool.on("error", () => {
        globalThis.__fbSqlPool = undefined;
      });
      return pool;
    })
    .catch((err) => {
      globalThis.__fbSqlPool = undefined;
      throw err;
    });
}

export function getPool(): Promise<sql.ConnectionPool> {
  globalThis.__fbSqlPool ??= createPool();
  return globalThis.__fbSqlPool;
}

// ── parameters ──────────────────────────────────────────────────────────────

/**
 * Exactly what Request.input accepts. Not `ISqlTypeFactory`: that interface is empty
 * in @types/mssql, so it carries no call signature and the concrete types
 * (UniqueIdentifier, NVarChar, …) fail to satisfy it.
 */
export type SqlParamType = (() => sql.ISqlType) | sql.ISqlType;

export interface QueryParam {
  name: string;
  type: SqlParamType;
  value: unknown;
}

/**
 * Constructors for the parameter types this app actually uses.
 *
 * Preferred over hand-writing `{ name, type: sql.X, value }` for two reasons. It
 * stops a value being paired with the wrong type — passing a string where the
 * column is uniqueidentifier makes SQL Server convert on every row and abandon the
 * index — and it sidesteps a TypeScript trap: an array literal infers its element
 * type from the first entry, so a later `.push` of a differently-typed param fails
 * to compile for reasons that have nothing to do with the query.
 */
export const p = {
  uuid: (name: string, value: string): QueryParam => ({
    name,
    type: sql.UniqueIdentifier,
    value,
  }),
  str: (name: string, value: string | null): QueryParam => ({
    name,
    type: sql.NVarChar,
    value,
  }),
  int: (name: string, value: number): QueryParam => ({
    name,
    type: sql.Int,
    value,
  }),
  date: (name: string, value: string | Date): QueryParam => ({
    name,
    type: sql.Date,
    value,
  }),
  dateTime: (name: string, value: string | Date): QueryParam => ({
    name,
    type: sql.DateTime2,
    value,
  }),
  bool: (name: string, value: boolean): QueryParam => ({
    name,
    type: sql.Bit,
    value,
  }),
} as const;

// ── execution ───────────────────────────────────────────────────────────────

const WRITE_KEYWORDS =
  /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE)\b/i;

/** Queries slower than this are logged in development, with their label. */
const SLOW_QUERY_MS = 500;

export interface QueryOptions {
  /** Short name used in errors and slow-query logs, e.g. "comments.list". */
  label?: string;
}

/**
 * Runs a parameterised read and returns the rows.
 *
 * Writes are refused. Every mutation belongs to the .NET API: it holds the page
 * tokens, calls Meta, and keeps the warehouse and Facebook in step. A write issued
 * straight to SQL would change the dashboard's copy while Facebook knew nothing
 * about it, which is worse than failing outright.
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: QueryParam[] = [],
  options: QueryOptions = {}
): Promise<T[]> {
  const label = options.label ?? "query";

  if (WRITE_KEYWORDS.test(text)) {
    throw new Error(
      `${label}: src/lib/db.ts is read-only. Route writes through the .NET API so Meta and the warehouse stay in step.`
    );
  }

  const started = Date.now();

  try {
    const pool = await getPool();
    const request = pool.request();
    for (const param of params) request.input(param.name, param.type, param.value);

    const result = await request.query<T>(text);

    const elapsed = Date.now() - started;
    if (process.env.NODE_ENV !== "production" && elapsed > SLOW_QUERY_MS) {
      console.warn(`[db] ${label} took ${elapsed}ms`);
    }

    return result.recordset ?? [];
  } catch (err) {
    // The driver's message alone ("Invalid column name 'x'") gives no clue which of
    // a dozen reads produced it, so the label travels with it.
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`${label}: ${message}`);
  }
}

/** Convenience for reads that return at most one row. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: QueryParam[] = [],
  options: QueryOptions = {}
): Promise<T | null> {
  const rows = await query<T>(text, params, options);
  return rows[0] ?? null;
}

/**
 * Guards an identifier that is interpolated into SQL rather than parameterised.
 *
 * Table and column names cannot be parameters, so the few queries that vary them
 * build a string. Those names come from constants in this codebase, never from a
 * request — but "never" is a claim that survives only as long as someone remembers
 * it, so this makes the compiler enforce it instead.
 */
export function assertSafeIdentifier(name: string, allowed: readonly string[]): string {
  if (!allowed.includes(name)) {
    throw new Error(
      `Refusing to interpolate '${name}' into SQL: not in the allow-list [${allowed.join(", ")}].`
    );
  }
  return name;
}

export { sql };
