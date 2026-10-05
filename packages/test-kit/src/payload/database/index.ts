import { postgresAdapter } from "@payloadcms/db-postgres";
import type { DatabaseAdapterObj } from "payload";

import { createPgLiteAdapter } from "./pglite";
import {
  dropPostgresWorkerSchema,
  getPostgresWorkerSchemaName,
  provisionPostgresWorkerSchema,
} from "./postgres";

export type TestDatabaseDriver = "postgres" | "pglite";

export interface CreateTestDatabaseOptions {
  connectionString?: string;
  workerId?: string;
}

export interface TestDatabaseAdapter extends DatabaseAdapterObj {
  adapter: DatabaseAdapterObj;
  driver: TestDatabaseDriver;
  schemaName?: string;
  teardown: () => Promise<void>;
}

export const createTestDatabase = async (
  options?: CreateTestDatabaseOptions
): Promise<TestDatabaseAdapter> => {
  const workerId = options?.workerId ?? process.env.VITEST_POOL_ID ?? "0";
  const connectionString =
    options?.connectionString ?? process.env.TEST_DATABASE_URL?.trim();

  if (connectionString) {
    const schemaName = getPostgresWorkerSchemaName(workerId);
    await provisionPostgresWorkerSchema({
      connectionString,
      schemaName,
    });

    const baseAdapter = postgresAdapter({
      pool: { connectionString },
      schemaName,
    });

    return Object.assign(baseAdapter, {
      adapter: baseAdapter,
      driver: "postgres" as const,
      schemaName,
      teardown: async () => {
        await dropPostgresWorkerSchema({ connectionString, schemaName });
      },
    });
  }

  const baseAdapter = createPgLiteAdapter();

  return Object.assign(baseAdapter, {
    adapter: baseAdapter,
    driver: "pglite" as const,
    teardown: async () => {
      // In-memory PGlite adapter is automatically discarded on teardown.
    },
  });
};
