import type { Payload } from "payload";

export interface PostgresAdapterLike {
  name?: string;
  pool?: {
    query: (
      query: string,
      params?: unknown[]
    ) => Promise<{ rows?: { tablename?: string }[] }>;
  };
  schemaName?: string;
}

export interface DrizzleAdapterLike {
  drizzle: unknown;
  execute: (args: { drizzle: unknown; raw: string }) => Promise<unknown>;
  primaryDrizzle?: unknown;
  tables?: Record<string, { readonly dbName?: string }>;
}

export type DatabaseWithDrizzle = Payload["db"] & DrizzleAdapterLike;

export const resetPostgresDatabase = async (
  db: PostgresAdapterLike
): Promise<void> => {
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
    const tablesResult = await db.pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = $1;",
      [schemaName]
    );

    const rows = tablesResult?.rows ?? [];
    const tableNames: string[] = [];
    for (const row of rows) {
      if (row && typeof row.tablename === "string") {
        tableNames.push(row.tablename);
      }
    }

    if (tableNames.length === 0) {
      return;
    }

    const tableList = tableNames
      .map(
        (tableName) =>
          `"${schemaName.replaceAll('"', '""')}"."${tableName.replaceAll('"', '""')}"`
      )
      .join(", ");

    await db.pool.query(
      `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`
    );
  }
};

export const resetSqliteDatabase = async (
  db: DatabaseWithDrizzle
): Promise<void> => {
  // SAFETY: SQLite adapter exposes DrizzleAdapter interface with execute method and table map on payload.db.
  const dbWithDrizzle = db as DatabaseWithDrizzle;
  const drizzle = dbWithDrizzle.primaryDrizzle ?? dbWithDrizzle.drizzle;
  const tableNames = dbWithDrizzle.tables
    ? Object.keys(dbWithDrizzle.tables)
    : [];
  if (tableNames.length === 0) {
    return;
  }

  await dbWithDrizzle.execute({ drizzle, raw: "PRAGMA foreign_keys = OFF;" });
  try {
    for (const tableName of tableNames) {
      // oxlint-disable-next-line eslint/no-await-in-loop
      await dbWithDrizzle.execute({
        drizzle,
        raw: `DELETE FROM "${tableName.replaceAll('"', '""')}";`,
      });
    }
  } finally {
    await dbWithDrizzle.execute({ drizzle, raw: "PRAGMA foreign_keys = ON;" });
  }
};

export const resetDatabase = async (payload: Payload): Promise<void> => {
  const { db } = payload;
  if (!db || typeof db !== "object") {
    return;
  }

  const isPostgres =
    ("name" in db && db.name === "postgres") ||
    ("schemaName" in db && typeof db.schemaName === "string");

  if (isPostgres) {
    // SAFETY: Verified db is postgres adapter conforming to PostgresAdapterLike.
    await resetPostgresDatabase(db as PostgresAdapterLike);
    return;
  }

  // SAFETY: Non-postgres adapter is SQLite adapter conforming to DatabaseWithDrizzle.
  await resetSqliteDatabase(db as DatabaseWithDrizzle);
};
