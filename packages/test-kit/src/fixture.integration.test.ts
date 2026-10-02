import { expect } from "vitest";

import { describe, it } from "./index";

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
