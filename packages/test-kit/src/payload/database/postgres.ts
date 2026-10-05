import type { Payload } from "payload";
import { Pool } from "pg";

const quoteIdentifier = (name: string): string =>
  `"${name.replaceAll('"', '""')}"`;

export interface PgPoolLike {
  close?: () => Promise<void>;
  end?: () => Promise<void>;
  query: (
    queryText: string,
    values?: unknown[]
  ) => Promise<{ rows?: unknown[] }>;
}

export interface ProvisionPostgresWorkerSchemaOptions {
  closePool?: boolean;
  connectionString?: string;
  pool?: PgPoolLike;
  schemaName?: string;
}

export const getPostgresWorkerSchemaName = (workerId?: string): string => {
  const id = workerId ?? process.env.VITEST_POOL_ID ?? "0";
  return `test_worker_${id}`;
};

export const provisionPostgresWorkerSchema = async (
  options?: ProvisionPostgresWorkerSchemaOptions
): Promise<void> => {
  const schemaName = options?.schemaName ?? getPostgresWorkerSchemaName();
  let pool = options?.pool;
  let shouldClosePool = options?.closePool ?? true;

  if (!pool) {
    const connectionString =
      options?.connectionString ?? process.env.TEST_DATABASE_URL;
    if (!connectionString?.trim()) {
      throw new Error(
        "TEST_DATABASE_URL environment variable must be set to run integration tests against PostgreSQL"
      );
    }
    pool = new Pool({ connectionString });
    shouldClosePool = true;
  }

  const quotedSchema = quoteIdentifier(schemaName);
  try {
    await pool.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE;`);
    await pool.query(`CREATE SCHEMA ${quotedSchema};`);
  } finally {
    if (shouldClosePool) {
      await (pool.end ? pool.end() : pool.close?.());
    }
  }
};

export interface DropPostgresWorkerSchemaOptions {
  connectionString?: string;
  pool?: PgPoolLike;
  schemaName?: string;
}

const dropPayloadAdapterSchema = async (db: unknown): Promise<void> => {
  if (!db || typeof db !== "object") {
    return;
  }
  const schemaName =
    "schemaName" in db && typeof db.schemaName === "string"
      ? db.schemaName
      : undefined;
  if (!schemaName) {
    return;
  }

  const dropSql = `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE;`;

  if ("execute" in db && typeof db.execute === "function") {
    await db.execute({ raw: dropSql });
    return;
  }

  if (
    "pool" in db &&
    db.pool &&
    typeof db.pool === "object" &&
    "query" in db.pool &&
    typeof db.pool.query === "function"
  ) {
    // SAFETY: Verified db.pool conforms to PgPoolLike with callable query function.
    const pool = db.pool as PgPoolLike;
    await pool.query(dropSql);
  }
};

export const dropPostgresWorkerSchema = async (
  target: Payload | DropPostgresWorkerSchemaOptions
): Promise<void> => {
  if ("db" in target) {
    await dropPayloadAdapterSchema(target.db);
    return;
  }

  const {
    connectionString: targetUrl,
    pool: targetPool,
    schemaName: targetSchema,
  } = target;
  const schemaName = targetSchema ?? getPostgresWorkerSchemaName();
  const dropSql = `DROP SCHEMA IF EXISTS ${quoteIdentifier(schemaName)} CASCADE;`;

  let pool = targetPool;
  let shouldClosePool = false;

  if (!pool) {
    const connectionString = targetUrl ?? process.env.TEST_DATABASE_URL;
    if (!connectionString?.trim()) {
      return;
    }
    pool = new Pool({ connectionString });
    shouldClosePool = true;
  }

  try {
    await pool.query(dropSql);
  } finally {
    if (shouldClosePool) {
      await (pool.end ? pool.end() : pool.close?.());
    }
  }
};

export const truncatePostgresTables = async (
  pool: PgPoolLike,
  schemaName = "public"
): Promise<void> => {
  const targetSchema = schemaName.trim() || "public";
  const tablesResult = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = $1;",
    [targetSchema]
  );
  // SAFETY: pg_tables query returns tablename column strings for database tables.
  const rows = (tablesResult?.rows ?? []) as { tablename?: string }[];
  const tableNames: string[] = [];

  for (const row of rows) {
    if (
      row &&
      typeof row.tablename === "string" &&
      row.tablename !== "payload_migrations"
    ) {
      tableNames.push(row.tablename);
    }
  }

  if (tableNames.length === 0) {
    return;
  }

  const quotedSchema = quoteIdentifier(targetSchema);
  const tableList = tableNames
    .map((tableName) => `${quotedSchema}.${quoteIdentifier(tableName)}`)
    .join(", ");

  await pool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
};
