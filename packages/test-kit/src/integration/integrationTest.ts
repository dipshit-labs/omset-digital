import type { Payload, PayloadRequest } from "payload";
import type { TestAPI } from "vitest";
import type { TestPayloadConfigOverrides } from "../payload/createTestPayload";
import type { CreateReqFn } from "../payload/createTestReq";

import { test } from "vitest";

import { createTestPayload } from "../payload/createTestPayload";
import { createTestReq } from "../payload/createTestReq";
import { resetDatabase } from "../payload/resetDatabase";

export interface TestKitFixtures {
  createReq: CreateReqFn;
  payload: Payload;
  req: PayloadRequest;
}

let ambientFilePayloadConfig: TestPayloadConfigOverrides | undefined;

export const setFilePayloadConfig = (
  overrides: TestPayloadConfigOverrides
): void => {
  ambientFilePayloadConfig = overrides;
};

export const buildIntegrationTestRunner = (
  overrides?: TestPayloadConfigOverrides
): TestAPI<TestKitFixtures> => {
  const runner = test.extend<{
    _reset: null;
    createReq: CreateReqFn;
    payload: unknown;
    req: unknown;
  }>({
    _reset: [
      async ({ payload }, provide) => {
        // SAFETY: Injected fixture passes initialized Payload instance into teardown reset.
        await resetDatabase(payload as never);
        await provide(null);
      },
      { auto: true },
    ],
    createReq: [
      async ({ task: _task }, provide) => {
        await provide((opts) => createTestReq(opts));
      },
      { scope: "file" },
    ],
    payload: [
      async ({ task: _task }, provide) => {
        const payloadInstance = await createTestPayload(
          overrides ?? ambientFilePayloadConfig,
          overrides?.cacheKey
        );
        await provide(payloadInstance);
        await payloadInstance.destroy();
      },
      { scope: "file" },
    ],
    req: [
      async ({ createReq }, provide) => {
        await provide(createReq());
      },
      { scope: "test" },
    ],
  });

  // SAFETY: Extended runner satisfies TestKitFixtures test API for integration consumers.
  return runner as TestAPI<TestKitFixtures>;
};

export const integrationTest: TestAPI<TestKitFixtures> =
  buildIntegrationTestRunner();
export { integrationTest as it, integrationTest as test };
