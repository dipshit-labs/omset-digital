import { describe, expect, it } from "vitest";

import { createTestPayload, destroyTestPayload } from "@repo/test-kit";

describe(
  "@repo/test-kit createTestPayload cacheKey lifecycle",
  { timeout: 15_000 },
  () => {
    it("registers in global._payload under explicit cacheKey and deletes on destroy", async () => {
      const testKey = "custom-test-cache-key";

      const payload = await createTestPayload(
        {
          collections: [
            {
              fields: [{ name: "name", type: "text" }],
              slug: "test_items",
            },
          ],
        },
        testKey
      );

      try {
        expect(global._payload).toBeDefined();
        expect(global._payload?.has(testKey)).toBeTruthy();
      } finally {
        await payload.destroy();
      }

      expect(global._payload?.has(testKey)).toBeFalsy();
    });

    it("accepts cacheKey inside options object", async () => {
      const testKey = "options-cache-key";

      const payload = await createTestPayload(
        {
          collections: [
            {
              fields: [{ name: "name", type: "text" }],
              slug: "test_items_opt",
            },
          ],
        },
        { cacheKey: testKey }
      );

      try {
        expect(global._payload?.has(testKey)).toBeTruthy();
      } finally {
        await payload.destroy();
      }

      expect(global._payload?.has(testKey)).toBeFalsy();
    });

    it("deletes from global._payload when destroyTestPayload is called directly", async () => {
      const testKey = "direct-destroy-cache-key";

      const payload = await createTestPayload(
        {
          collections: [
            {
              fields: [{ name: "name", type: "text" }],
              slug: "test_items_direct",
            },
          ],
        },
        testKey
      );

      expect(global._payload?.has(testKey)).toBeTruthy();
      await destroyTestPayload(payload);
      expect(global._payload?.has(testKey)).toBeFalsy();
    });
  }
);
