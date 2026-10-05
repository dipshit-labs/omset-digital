import { describe, expect } from "vitest";

import { integrationSuite, integrationTest } from "../../src/index";

describe("@repo/test-kit default fixture", () => {
  integrationTest("injects a working payload instance", async ({ payload }) => {
    expect(payload).toBeDefined();
    expect(payload.find).toBeTypeOf("function");

    const user = await payload.create({
      collection: "users",
      data: {
        email: "fixture-test@example.com",
        password: "Password123!",
      },
    });

    expect(user.id).toBeDefined();

    const found = await payload.find({ collection: "users" });
    expect(found.totalDocs).toBe(1);
  });

  integrationTest("ensures a clean database state", async ({ payload }) => {
    const found = await payload.find({ collection: "users" });
    expect(found.totalDocs).toBe(0);
  });
});

const customSuite = integrationSuite({
  collections: [
    {
      fields: [{ name: "title", type: "text" }],
      slug: "articles",
    },
  ],
});

customSuite.describe("integrationSuite custom runner", () => {
  customSuite.it(
    "injects payload, req, and createReq fixtures",
    ({ createReq, payload, req }) => {
      expect(payload).toBeDefined();
      expect(req).toBeDefined();
      expect(req.headers).toBeInstanceOf(Headers);
      expect(req.user).toBeNull();
      expect(createReq).toBeTypeOf("function");
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

      const article = await payload.create({
        collection: "articles",
        data: { title: "First Post" },
        req: customReq,
      });

      expect(article.title).toBe("First Post");

      const found = await payload.find({ collection: "articles" });
      expect(found.totalDocs).toBe(1);
    }
  );

  customSuite.it(
    "resets collection data across test runs",
    async ({ payload }) => {
      const found = await payload.find({ collection: "articles" });
      expect(found.totalDocs).toBe(0);
    }
  );
});
