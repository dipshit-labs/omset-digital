import type { SuiteAPI, TestAPI } from "vitest";
import { describe } from "vitest";

import type { TestPayloadConfigOverrides } from "../payload/createTestPayload";
import {
  buildIntegrationTestRunner,
  setFilePayloadConfig,
} from "./integrationTest";
import type { TestKitFixtures } from "./integrationTest";

export { describe } from "vitest";

export type IntegrationSuiteOptions = TestPayloadConfigOverrides;

export interface IntegrationSuite {
  describe: SuiteAPI;
  it: TestAPI<TestKitFixtures>;
  test: TestAPI<TestKitFixtures>;
}

export const setTestPayloadConfig = (
  overrides: TestPayloadConfigOverrides
): void => {
  setFilePayloadConfig(overrides);
};

export const integrationSuite = (
  overrides?: IntegrationSuiteOptions
): IntegrationSuite => {
  const runner = buildIntegrationTestRunner(overrides);
  return {
    describe,
    it: runner,
    test: runner,
  };
};

export const defineIntegrationSuite = integrationSuite;
