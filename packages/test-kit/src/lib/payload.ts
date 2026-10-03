import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig, getPayload } from "payload";
import type { Payload } from "payload";

import {
  dropPostgresWorkerSchema,
  getPostgresWorkerSchemaName,
  provisionPostgresWorkerSchema,
} from "./postgres";
import { createSqliteAdapter } from "./sqlite";
import type { TestPayloadConfigOverrides } from "./types";

const TEST_SECRET = "test-secret-must-be-at-least-32-chars-long";

export const createTestPayload = async (
  overrides?: TestPayloadConfigOverrides
): Promise<Payload> => {
  process.env.PAYLOAD_DROP_DATABASE = "true";
  process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = "true";

  const workerId = process.env.VITEST_POOL_ID ?? "0";
  const db = overrides?.db ?? createSqliteAdapter(workerId);

  const config = await buildConfig({
    ...overrides,
    db,
    secret: TEST_SECRET,
    telemetry: false,
    logger: overrides?.logger ?? {
      options: {
        level: "error",
      },
    },
    typescript: {
      ...overrides?.typescript,
      autoGenerate: false,
      // SAFETY: Payload config types require string for outputFile, but runtime accepts false to disable type generation during tests.
      outputFile: false as never,
    },
  });

  const cacheKey = `test-kit-${workerId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return getPayload({ config, key: cacheKey });
};

export const createAppTestPayload = async (
  overrides?: TestPayloadConfigOverrides
): Promise<Payload> => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    throw new Error(
      "DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
    );
  }

  process.env.PAYLOAD_DROP_DATABASE = "true";
  process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = "true";

  const workerId = process.env.VITEST_POOL_ID ?? "0";
  const schemaName = getPostgresWorkerSchemaName(workerId);

  await provisionPostgresWorkerSchema({ connectionString, schemaName });
  const db =
    overrides?.db ??
    postgresAdapter({
      schemaName,
      pool: {
        connectionString,
      },
    });
  const config = await buildConfig({
    ...overrides,
    db,
    secret: TEST_SECRET,
    telemetry: false,
    logger: overrides?.logger ?? {
      options: {
        level: "error",
      },
    },
    typescript: {
      ...overrides?.typescript,
      autoGenerate: false,
      // SAFETY: Payload config types require string for outputFile, but runtime accepts false to disable type generation during tests.
      outputFile: false as never,
    },
  });

  const cacheKey = `test-kit-pg-${workerId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = await getPayload({ config, key: cacheKey });

  const originalDestroy = payload.destroy.bind(payload);
  payload.destroy = async () => {
    try {
      await dropPostgresWorkerSchema(payload);
    } finally {
      await originalDestroy();
    }
  };

  return payload;
};

export const createTestPayloadInstance = (
  overrides?: TestPayloadConfigOverrides
): Promise<Payload> => {
  if (overrides?.db) {
    return createTestPayload(overrides);
  }

  if (process.env.DATABASE_URL?.trim()) {
    return createAppTestPayload(overrides);
  }

  return createTestPayload(overrides);
};
