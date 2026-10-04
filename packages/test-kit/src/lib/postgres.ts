import type { Payload } from "payload";
import { Pool } from "pg";

import type { PgPoolLike, ProvisionPostgresWorkerSchemaOptions } from "./types";

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
      options?.connectionString ?? process.env.DATABASE_URL;
    if (!connectionString?.trim()) {
      throw new Error(
        "DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
      );
    }
    pool = new Pool({ connectionString });
    shouldClosePool = true;
  }

  try {
    await pool.query(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName.replaceAll('"', '""')}";`
    );
  } finally {
    if (shouldClosePool) {
      await pool.end();
    }
  }
};

export const dropPostgresWorkerSchema = async (
  target: Payload | { connectionString: string; schemaName?: string }
): Promise<void> => {
  if ("db" in target) {
    const { db } = target;
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
    if (
      "pool" in db &&
      db.pool &&
      typeof db.pool === "object" &&
      "query" in db.pool &&
      typeof db.pool.query === "function"
    ) {
      // SAFETY: Verified db.pool conforms to PgPoolLike with callable query function.
      const pool = db.pool as PgPoolLike;
      await pool.query(
        `DROP SCHEMA IF EXISTS "${schemaName.replaceAll('"', '""')}" CASCADE;`
      );
    }
    return;
  }

  const schemaName = target.schemaName ?? getPostgresWorkerSchemaName();
  const pool = new Pool({ connectionString: target.connectionString });
  try {
    await pool.query(
      `DROP SCHEMA IF EXISTS "${schemaName.replaceAll('"', '""')}" CASCADE;`
    );
  } finally {
    await pool.end();
  }
};
