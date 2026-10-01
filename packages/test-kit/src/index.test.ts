import { describe, expect, it } from "vitest";

import { createTestPayload, createTestReq, resetDatabase } from "./helpers";
import { describe as fixtureDescribe, it as fixtureIt } from "./index";

describe("@repo/test-kit fixture exports", () => {
  it("provides describe test suite runner", () => {
    expect(fixtureDescribe).toBeTypeOf("function");
  });

  it("provides it test case runner", () => {
    expect(fixtureIt).toBeTypeOf("function");
  });
});

describe("@repo/test-kit lifecycle helper stubs", () => {
  it("rejects createTestPayload until implemented", async () => {
    await expect(createTestPayload()).rejects.toThrow(
      "createTestPayload is not implemented yet"
    );
  });

  it("rejects resetDatabase until implemented", async () => {
    // SAFETY: Stub does not inspect payload properties before rejecting
    const stubPayload = {} as Parameters<typeof resetDatabase>[0];
    await expect(resetDatabase(stubPayload)).rejects.toThrow(
      "resetDatabase is not implemented yet"
    );
  });

  it("throws createTestReq until implemented", () => {
    expect(() => createTestReq()).toThrow(
      "createTestReq is not implemented yet"
    );
  });
});
