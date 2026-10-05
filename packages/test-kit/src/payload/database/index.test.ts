import { describe, expect, it } from "vitest";

import { createTestDatabase } from "./index";

describe("@repo/test-kit createTestDatabase auto-detection", () => {
  it("defaults to pglite driver when TEST_DATABASE_URL is not set", async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    try {
      const testDb = await createTestDatabase();
      expect(testDb.driver).toBe("pglite");
      expect(testDb.name).toBe("postgres");
      expect(testDb.adapter).toBe(testDb);
      expect(testDb.schemaName).toBeUndefined();
    } finally {
      if (originalTestUrl !== undefined) {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
    }
  });

  it("provides no-op teardown for in-memory pglite driver", async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    delete process.env.TEST_DATABASE_URL;
    try {
      const testDb = await createTestDatabase();
      expect(testDb.teardown).toBeTypeOf("function");
      await expect(testDb.teardown()).resolves.toBeUndefined();
    } finally {
      if (originalTestUrl !== undefined) {
        process.env.TEST_DATABASE_URL = originalTestUrl;
      }
    }
  });
});
