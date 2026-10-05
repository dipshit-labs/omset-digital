import type { Config, Payload } from "payload";
import type { TestDatabase } from "./database/createTestDatabase";

import { buildConfig, getPayload } from "payload";

import { toError } from "../lib/utils";

const TEST_SECRET = "test-secret-must-be-at-least-32-characters-long";

declare global {
  var _payload: Map<string, unknown> | undefined;
}

export interface CreateTestPayloadOptions extends Omit<
  Partial<Config>,
  "db" | "secret"
> {
  database: TestDatabase;
  secret?: string;
  key?: string;
}

export type TestPayload = Payload & {
  resetDatabase: () => Promise<void>;
};

const createPayloadKey = (): string => {
  const workerId = process.env.VITEST_POOL_ID ?? "0";

  return `test-payload-${workerId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const createTestPayload = async ({
  database,
  secret = TEST_SECRET,
  key = createPayloadKey(),
  logger,
  typescript,
  ...optionsOverrides
}: CreateTestPayloadOptions) => {
  process.env.PAYLOAD_DROP_DATABASE = "true";
  process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = "true";

  const config = await buildConfig({
    ...optionsOverrides,
    db: database.adapter,
    secret,
    telemetry: false,
    logger: logger ?? {
      options: {
        level: "error",
      },
    },
    typescript: {
      ...typescript,
      autoGenerate: false,
      // SAFETY: Payload config types require string for outputFile, but runtime accepts false to disable type generation during tests.
      outputFile: false as never,
    },
  });

  let payload: Payload | undefined;
  let destroyed = false;

  try {
    payload = await getPayload({
      key,
      config,
    });

    const originalDestroy = payload.destroy.bind(payload);

    const destroy = async (): Promise<void> => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      global._payload?.delete(key);

      let payloadError: unknown;

      try {
        await originalDestroy();
      } catch (error) {
        payloadError = error;
      }

      try {
        await database.destroy();
      } catch (databaseError) {
        if (payloadError !== undefined) {
          throw new AggregateError(
            [toError(payloadError), toError(databaseError)],
            "Payload and database cleanup both failed.",
            {
              cause: databaseError,
            }
          );
        }

        throw databaseError;
      }

      if (payloadError !== undefined) {
        throw toError(payloadError);
      }
    };

    // SAFETY: getPayload returns a plain Payload; resetDatabase is attached on the next line, before the value leaves this function.
    const testPayload = payload as TestPayload;
    testPayload.resetDatabase = database.reset;
    testPayload.destroy = destroy;

    return testPayload;
  } catch (error) {
    await database.destroy().catch(() => {
      // Preserve the original initialization error.
    });

    throw error;
  }
};
