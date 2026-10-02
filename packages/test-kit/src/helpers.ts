import fs from "node:fs";
import path from "node:path";

import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { buildConfig, getPayload } from "payload";
import type { Config, Payload, PayloadRequest } from "payload";

const TEST_SECRET = "test-secret-must-be-at-least-32-chars-long";

export type TestPayloadConfigOverrides = Partial<Config>;

export interface CreateTestReqOptions {
  headers?: Headers;
  user?: unknown;
}

export const createTestPayload = async (
  overrides?: TestPayloadConfigOverrides
): Promise<Payload> => {
  process.env.PAYLOAD_DROP_DATABASE = "true";
  process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = "true";

  const workerId = process.env.VITEST_POOL_ID ?? "0";
  const tmpDir = path.resolve(process.cwd(), ".tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const dbPath = `file:./.tmp/test-${workerId}.db`;

  const config = await buildConfig({
    ...overrides,
    secret: TEST_SECRET,
    telemetry: false,
    db: sqliteAdapter({
      logger: false,
      client: {
        url: dbPath,
      },
    }),
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

interface DrizzleAdapterLike {
  drizzle: unknown;
  execute: (args: { drizzle: unknown; raw: string }) => Promise<unknown>;
  primaryDrizzle?: unknown;
  tables?: Record<string, { readonly dbName?: string }>;
}

type DatabaseWithDrizzle = Payload["db"] & DrizzleAdapterLike;

export const resetDatabase = async (payload: Payload): Promise<void> => {
  // SAFETY: SQLite adapter exposes DrizzleAdapter interface with execute method and table map on payload.db.
  const db = payload.db as DatabaseWithDrizzle;
  const drizzle = db.primaryDrizzle ?? db.drizzle;
  const tableNames = db.tables ? Object.keys(db.tables) : [];
  if (tableNames.length === 0) {
    return;
  }

  await db.execute({ drizzle, raw: "PRAGMA foreign_keys = OFF;" });
  try {
    for (const tableName of tableNames) {
      // oxlint-disable-next-line eslint/no-await-in-loop
      await db.execute({
        drizzle,
        raw: `DELETE FROM "${tableName.replaceAll('"', '""')}";`,
      });
    }
  } finally {
    await db.execute({ drizzle, raw: "PRAGMA foreign_keys = ON;" });
  }
};

export const createTestReq = (
  options?: CreateTestReqOptions
): PayloadRequest => {
  const req = {
    headers: options?.headers ?? new Headers(),
    // SAFETY: Test user option duck-types as PayloadRequest user property for test execution.
    user: (options?.user ?? null) as PayloadRequest["user"],
  };

  // SAFETY: Stub satisfies the subset of PayloadRequest properties accessed by hooks and access controls.
  return req as PayloadRequest;
};
