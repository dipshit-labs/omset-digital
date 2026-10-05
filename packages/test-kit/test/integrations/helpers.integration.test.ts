import { describe, expect, it } from "vitest";

import { createTestPayload, resetDatabase } from "@repo/test-kit";

describe("@repo/test-kit lifecycle integration helpers", () => {
  it("boots a real Payload instance with in-tree in-memory PGlite adapter and relations", async () => {
    const payload = await createTestPayload({
      collections: [
        {
          fields: [{ name: "name", type: "text" }],
          slug: "categories",
        },
        {
          slug: "widgets",
          fields: [
            { name: "title", type: "text" },
            {
              name: "category",
              type: "relationship",
              relationTo: "categories",
            },
          ],
        },
      ],
    });

    try {
      await resetDatabase(payload);
      expect(payload.db.name).toBe("postgres");
      expect(payload.collections.widgets).toBeDefined();

      const category = await payload.create({
        collection: "categories",
        data: { name: "Electronics" },
      });

      const widget = await payload.create({
        collection: "widgets",
        data: { category: category.id, title: "Gadget" },
      });

      const foundWidget = await payload.findByID({
        id: widget.id,
        collection: "widgets",
      });
      expect(foundWidget.title).toBe("Gadget");
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
