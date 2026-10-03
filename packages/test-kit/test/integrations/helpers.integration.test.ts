import { describe, expect, it } from "vitest";

import { createTestPayload, resetDatabase } from "../../src/helpers";

describe("@repo/test-kit lifecycle integration helpers", () => {
  it("boots a real Payload instance with named shared in-memory SQLite URI", async () => {
    const workerId = process.env.VITEST_POOL_ID ?? "0";
    const expectedUri = `file:test_mem_${workerId}?mode=memory&cache=shared`;

    const payload = await createTestPayload({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          slug: "widgets",
        },
      ],
    });

    try {
      await resetDatabase(payload);
      expect(payload).toBeDefined();
      expect(payload.collections.widgets).toBeDefined();
      expect(payload.find).toBeTypeOf("function");
      let clientUrl: string | undefined;
      const { db } = payload;
      if (db && typeof db === "object" && "clientConfig" in db) {
        const { clientConfig } = db;
        if (
          clientConfig &&
          typeof clientConfig === "object" &&
          "url" in clientConfig
        ) {
          clientUrl =
            typeof clientConfig.url === "string" ? clientConfig.url : undefined;
        }
      }
      expect(clientUrl).toBe(expectedUri);
    } finally {
      await payload.destroy();
    }
  });

  it("persists and queries documents through the local API", async () => {
    const payload = await createTestPayload({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          slug: "widgets",
        },
      ],
    });

    try {
      await resetDatabase(payload);
      const doc = await payload.create({
        collection: "widgets",
        data: { title: "Widget Alpha" },
      });
      expect(doc.title).toBe("Widget Alpha");

      const found = await payload.find({ collection: "widgets" });
      expect(found.totalDocs).toBe(1);
      expect(found.docs[0]?.title).toBe("Widget Alpha");
    } finally {
      await payload.destroy();
    }
  });

  it("deletes all rows from database tables without re-running schema push", async () => {
    const payload = await createTestPayload({
      collections: [
        {
          fields: [{ name: "title", type: "text" }],
          slug: "widgets",
        },
      ],
    });

    try {
      await resetDatabase(payload);
      await payload.create({
        collection: "widgets",
        data: { title: "Widget to be deleted" },
      });

      const beforeReset = await payload.find({ collection: "widgets" });
      expect(beforeReset.totalDocs).toBe(1);

      await resetDatabase(payload);

      const afterReset = await payload.find({ collection: "widgets" });
      expect(afterReset.totalDocs).toBe(0);
    } finally {
      await payload.destroy();
    }
  });
});
