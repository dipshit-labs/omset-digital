import type { SuiteAPI, TestAPI } from "vitest";
import { describe, test } from "vitest";

import { createTestPayloadInstance } from "./lib/payload";
import { createTestReq } from "./lib/request";
import { resetDatabase } from "./lib/reset";
import type {
  CreateReqFn,
  TestKitFixtures,
  TestPayloadConfigOverrides,
} from "./lib/types";

export { describe } from "vitest";
export type {
  CreateReqFn,
  CreateTestReqOptions,
  TestKitFixtures,
  TestPayloadConfigOverrides,
} from "./lib/types";

let filePayloadConfig: TestPayloadConfigOverrides | undefined;

export const setTestPayloadConfig = (
  overrides: TestPayloadConfigOverrides
): void => {
  filePayloadConfig = overrides;
};

export interface IntegrationSuite {
  describe: SuiteAPI;
  it: TestAPI<TestKitFixtures>;
  test: TestAPI<TestKitFixtures>;
}

const buildRunner = (
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
        const payloadInstance = await createTestPayloadInstance(
          overrides ?? filePayloadConfig
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

export const defineIntegrationSuite = (
  overrides?: TestPayloadConfigOverrides
): IntegrationSuite => {
  const runner = buildRunner(overrides);
  return {
    describe,
    it: runner,
    test: runner,
  };
};

export const it: TestAPI<TestKitFixtures> = buildRunner();
export { it as test };
