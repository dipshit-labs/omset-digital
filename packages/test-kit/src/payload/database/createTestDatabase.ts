import type { DatabaseAdapterObj } from "payload";

import { createPgliteTestDatabase } from "./pglite";
import { createPostgresTestDatabase } from "./postgres";

export interface TestDatabase {
  adapter: DatabaseAdapterObj;
  reset: () => Promise<void>;
  destroy: () => Promise<void>;
}

interface CreateTestDatabaseOptions {
  postgresUrl?: string;
  workerId?: string;
}

export const createTestDatabase = (
  options: CreateTestDatabaseOptions = {}
): Promise<TestDatabase> => {
  const connectionString = process.env.TEST_DATABASE_URL?.trim();
  const workerId = options.workerId ?? process.env.VITEST_POOL_ID ?? "0";

  if (connectionString) {
    return createPostgresTestDatabase({
      connectionString,
      workerId,
    });
  }

  return createPgliteTestDatabase({
    workerId,
  });
};
