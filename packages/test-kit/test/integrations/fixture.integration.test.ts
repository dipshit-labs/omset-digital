import { expect } from "vitest";

import {
  defineIntegrationSuite,
  describe,
  integrationSuite,
  it,
} from "@repo/test-kit";

describe("@repo/test-kit fixture", () => {
  it("provides usable injected payload fixture", async ({ payload }) => {
    expect(payload).toBeDefined();
    expect(payload.find).toBeTypeOf("function");

    await payload.create({
      collection: "users",
      data: {
        email: "fixture-test@example.com",
        password: "Password123!",
      },
    });

    const found = await payload.find({ collection: "users" });
    expect(found.totalDocs).toBe(1);
  });

  it("automatically resets database between fixture tests", async ({
    payload,
  }) => {
    const found = await payload.find({ collection: "users" });
    expect(found.totalDocs).toBe(0);
  });
});

const customSuite = defineIntegrationSuite({
  collections: [
    {
      fields: [{ name: "title", type: "text" }],
      slug: "articles",
    },
  ],
});

customSuite.describe("defineIntegrationSuite runner", () => {
  customSuite.it(
    "injects payload and default req fixture",
    ({ createReq: _createReq, payload, req }) => {
      expect(payload).toBeDefined();
      expect(req).toBeDefined();
      expect(req.headers).toBeInstanceOf(Headers);
      expect(req.user).toBeNull();
    }
  );

  customSuite.it(
    "creates custom request context and persists documents",
    async ({ createReq, payload }) => {
      const customReq = createReq({
        headers: new Headers({ "x-tenant-id": "tenant-99" }),
        user: { id: "user-1", email: "admin@example.com" },
      });
      expect(customReq.headers.get("x-tenant-id")).toBe("tenant-99");
      expect(customReq.user?.email).toBe("admin@example.com");

      await payload.create({
        collection: "articles",
        data: { title: "First Post" },
        req: customReq,
      });

      const found = await payload.find({ collection: "articles" });
      expect(found.totalDocs).toBe(1);
    }
  );

  customSuite.it(
    "automatically resets collection data between tests in custom suite",
    async ({ payload }) => {
      const found = await payload.find({ collection: "articles" });
      expect(found.totalDocs).toBe(0);
    }
  );
});

const newSuite = integrationSuite({
  collections: [
    {
      fields: [{ name: "name", type: "text" }],
      slug: "tags",
    },
  ],
});

newSuite.describe(
  "integrationSuite runner with integrationTest fixtures",
  () => {
    newSuite.it(
      "injects payload and req fixtures in newSuite",
      async ({ payload, req }) => {
        expect(payload).toBeDefined();
        expect(req).toBeDefined();
        const tag = await payload.create({
          collection: "tags",
          data: { name: "typescript" },
        });
        expect(tag.name).toBe("typescript");
      }
    );

    newSuite.test(
      "resets database between test cases in newSuite",
      async ({ payload }) => {
        const found = await payload.find({ collection: "tags" });
        expect(found.totalDocs).toBe(0);
      }
    );
  }
);
