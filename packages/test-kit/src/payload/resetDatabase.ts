import type { Payload } from "payload";

import type { PgPoolLike } from "./database/postgres";
import { truncatePostgresTables } from "./database/postgres";

export interface PostgresAdapterLike {
  name?: string;
  pool?: PgPoolLike;
  schemaName?: string;
}

export const resetPostgresDatabase = async (
  db: PostgresAdapterLike
): Promise<void> => {
  const schemaName =
    "schemaName" in db &&
    typeof db.schemaName === "string" &&
    db.schemaName.trim()
      ? db.schemaName
      : "public";

  if (
    "pool" in db &&
    db.pool &&
    typeof db.pool === "object" &&
    "query" in db.pool &&
    typeof db.pool.query === "function"
  ) {
    await truncatePostgresTables(db.pool, schemaName);
  }
};

export const resetDatabase = async (payload: Payload): Promise<void> => {
  const { db } = payload;
  if (!db || typeof db !== "object") {
    return;
  }
  // SAFETY: Active database adapter exposes duck-typed Postgres query pool.
  await resetPostgresDatabase(db as PostgresAdapterLike);
};
