import type { SuiteAPI, TestAPI } from "vitest";
import type {
  IntegrationTestFixtures,
  TestPayloadConfig,
} from "./integrationTest";

import { describe } from "vitest";

import { createIntegrationTest } from "./integrationTest";

type SuiteCleanup = () => unknown;

export interface IntegrationSuiteOptions {
  setup: (
    context: Pick<IntegrationTestFixtures, "payload">
  ) => Promise<SuiteCleanup | undefined> | SuiteCleanup | undefined;
}

export interface IntegrationSuite {
  describe: SuiteAPI;
  it: TestAPI<IntegrationTestFixtures>;
  test: TestAPI<IntegrationTestFixtures>;
}

export interface CreateIntegrationSuiteConfig extends TestPayloadConfig {
  cacheKey?: string;
}

export const createIntegrationSuite = (
  config: CreateIntegrationSuiteConfig = {}
) => {
  const { cacheKey, ...payloadConfig } = config;
  const configuredTest = createIntegrationTest({
    cacheKey,
    payload: payloadConfig,
  });

  // SAFETY: Extending the configured test with an auto-use suiteLifecycle fixture keeps the IntegrationTestFixtures contract; the extra fixture is internal.
  return (options: IntegrationSuiteOptions): TestAPI<IntegrationTestFixtures> =>
    configuredTest.extend<{ suiteLifecycle: undefined }>({
      suiteLifecycle: [
        async ({ payload }, use) => {
          const cleanup = await options.setup({ payload });

          try {
            // oxlint-disable-next-line react-hooks/rules-of-hooks unicorn/no-useless-undefined
            await use(undefined);
          } finally {
            await cleanup?.();
          }
        },
        {
          auto: true,
          scope: "file",
        },
      ],
    }) as TestAPI<IntegrationTestFixtures>;
};

export const integrationSuite = (
  config: CreateIntegrationSuiteConfig = {}
): IntegrationSuite => {
  const { cacheKey, ...payloadConfig } = config;
  const runner = createIntegrationTest({ cacheKey, payload: payloadConfig });
  return { describe, it: runner, test: runner };
};
