import type { Config, PayloadRequest } from "payload";
import type { TestAPI } from "vitest";
import type { TestPayload } from "../payload/createTestPayload";
import type { CreateReqFn } from "../payload/createTestReq";

import { test as base } from "vitest";

import { createTestPayload } from "../payload/createTestPayload";
import { createTestReq } from "../payload/createTestReq";
import { createTestDatabase } from "../payload/database/createTestDatabase";

export type TestPayloadConfig = Omit<Partial<Config>, "db" | "secret">;

export interface CreateIntegrationTestOptions {
  payload?: TestPayloadConfig;
  cacheKey?: string;
}

export interface IntegrationTestFixtures {
  createReq: CreateReqFn;
  payload: TestPayload;
  req: PayloadRequest;
  databaseReset: null;
}

export const createIntegrationTest = ({
  payload: payloadConfig = {},
  cacheKey,
}: CreateIntegrationTestOptions = {}): TestAPI<IntegrationTestFixtures> => {
  const runner = base.extend<IntegrationTestFixtures>({
    databaseReset: [
      async ({ payload }, use) => {
        await payload.resetDatabase();
        await use(null);
      },
      {
        auto: true,
        scope: "test",
      },
    ],

    createReq: [
      async ({ task: _task }, use) => {
        await use((opts) => createTestReq(opts));
      },
      { scope: "file" },
    ],

    payload: [
      async ({ task: _task }, use) => {
        const database = await createTestDatabase();

        const payload = await createTestPayload({
          ...payloadConfig,
          key: cacheKey,
          database,
        });

        try {
          // oxlint-disable-next-line react-hooks/rules-of-hooks
          await use(payload);
        } finally {
          await payload.destroy();
        }
      },
      { scope: "file" },
    ],

    req: [
      async ({ createReq }, use) => {
        await use(createReq());
      },
      { scope: "test" },
    ],
  });

  // SAFETY: Extended runner satisfies IntegrationTestFixtures test API for integration consumers.
  return runner as TestAPI<IntegrationTestFixtures>;
};

export const integrationTest: TestAPI<IntegrationTestFixtures> =
  createIntegrationTest();
