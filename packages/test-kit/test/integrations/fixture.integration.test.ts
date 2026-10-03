import { defineIntegrationSuite, describe, it } from "@repo/test-kit";
import { expect } from "vitest";

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
        user: { email: "admin@example.com", id: "user-1" },
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
