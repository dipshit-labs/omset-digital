import type { Payload } from "payload";
import type { TestAPI } from "vitest";
import { test } from "vitest";

import { createTestPayload, resetDatabase } from "./helpers";

export { describe } from "vitest";

export interface TestKitFixtures {
  payload: Payload;
}

interface InternalTestFixtures extends TestKitFixtures {
  _reset: null;
}

const baseIt = test.extend<InternalTestFixtures>({
  _reset: [
    async ({ payload }, use) => {
      await resetDatabase(payload);
      await use(null);
    },
    { auto: true },
  ],
  payload: [
    async ({ task: _task }, use) => {
      const payload = await createTestPayload();
      await use(payload);
      await payload.destroy();
    },
    { scope: "file" },
  ],
});

export const it: TestAPI<TestKitFixtures> = baseIt;
export { it as test };
