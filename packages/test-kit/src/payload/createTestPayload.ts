import { buildConfig, getPayload } from "payload";
import type { Config, Payload } from "payload";

import { createTestDatabase } from "./database";
import {
  CACHE_KEY_SYMBOL,
  destroyTestPayload,
  ORIGINAL_DESTROY,
} from "./destroyTestPayload";
import type { ManagedTestPayload } from "./destroyTestPayload";

const TEST_SECRET = "test-secret-must-be-at-least-32-chars-long";

export interface CreateTestPayloadOptions {
  cacheKey?: string;
}

export interface TestPayloadConfigOverrides extends Partial<Config> {
  cacheKey?: string;
}

export const createTestPayload = async (
  overrides?: TestPayloadConfigOverrides,
  cacheKeyOrOptions?: string | CreateTestPayloadOptions
): Promise<Payload> => {
  process.env.PAYLOAD_DROP_DATABASE = "true";
  process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = "true";

  const workerId = process.env.VITEST_POOL_ID ?? "0";
  const explicitKey =
    typeof cacheKeyOrOptions === "string"
      ? cacheKeyOrOptions
      : (cacheKeyOrOptions?.cacheKey ?? overrides?.cacheKey);

  const effectiveCacheKey =
    explicitKey ??
    `test-kit-${workerId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let db = overrides?.db;
  if (!db) {
    db = await createTestDatabase({ workerId });
  }

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

  const payload = await getPayload({ key: effectiveCacheKey, config });

  // SAFETY: Enriches Payload instance with test-kit lifecycle symbols for teardown.
  const managedPayload = payload as ManagedTestPayload;
  managedPayload[CACHE_KEY_SYMBOL] = effectiveCacheKey;
  managedPayload[ORIGINAL_DESTROY] = payload.destroy.bind(payload);

  payload.destroy = async () => {
    await destroyTestPayload(payload, effectiveCacheKey);
  };

  return payload;
};

export const createAppTestPayload = async (
  overrides?: TestPayloadConfigOverrides,
  cacheKeyOrOptions?: string | CreateTestPayloadOptions
): Promise<Payload> => {
  const connectionString = process.env.TEST_DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL environment variable must be set to run application integration tests against PostgreSQL"
    );
  }

  return await createTestPayload(overrides, cacheKeyOrOptions);
};
