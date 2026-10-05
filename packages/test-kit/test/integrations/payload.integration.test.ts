import { describe, expect, it } from "vitest";

import { createTestPayload } from "../../src/payload/createTestPayload";
import { createTestDatabase } from "../../src/payload/database/createTestDatabase";

describe(
  "@repo/test-kit createTestPayload lifecycle",
  { timeout: 15_000 },
  () => {
    it("boots a Payload instance and tears it down without error", async () => {
      const database = await createTestDatabase();
      const payload = await createTestPayload({
        database,
        collections: [
          {
            fields: [{ name: "name", type: "text" }],
            slug: "test_items",
          },
        ],
      });

      expect(payload.find).toBeTypeOf("function");
      await payload.destroy();
    });

    it("exposes resetDatabase that clears rows without re-running schema push", async () => {
      const database = await createTestDatabase();
      const payload = await createTestPayload({
        database,
        collections: [
          {
            fields: [{ name: "name", type: "text" }],
            slug: "test_items",
          },
        ],
      });

      try {
        await payload.create({ collection: "test_items", data: { name: "a" } });
        await payload.create({ collection: "test_items", data: { name: "b" } });

        const before = await payload.find({ collection: "test_items" });
        expect(before.totalDocs).toBe(2);

        await payload.resetDatabase();

        const after = await payload.find({ collection: "test_items" });
        expect(after.totalDocs).toBe(0);
      } finally {
        await payload.destroy();
      }
    });

    it("calling destroy twice does not throw", async () => {
      const database = await createTestDatabase();
      const payload = await createTestPayload({
        collections: [],
        database,
      });

      await payload.destroy();

      await expect(payload.destroy()).resolves.toBeUndefined();
    });

    it("removes the instance from Payload's global cache on destroy", async () => {
      const key = "test-kit-cache-cleanup";
      const database = await createTestDatabase();
      const payload = await createTestPayload({
        key,
        collections: [],
        database,
      });

      expect(global._payload?.has(key)).toBeTruthy();

      await payload.destroy();

      expect(global._payload?.has(key)).toBeFalsy();
    });
  }
);
