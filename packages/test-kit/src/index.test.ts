import { describe, expect, it } from "vitest";

import {
  createAppTestPayload,
  createTestPayload,
  getSqliteMemoryUri,
} from "./helpers";
import {
  createTestReq,
  defineIntegrationSuite,
  describe as fixtureDescribe,
  handlers,
  it as fixtureIt,
  server,
  setTestPayloadConfig,
  test as fixtureTest,
} from "./index";

describe("@repo/test-kit public interface exports", () => {
  it("provides test suite and test case runners", () => {
    expect(fixtureDescribe).toBeTypeOf("function");
    expect(fixtureIt).toBeTypeOf("function");
    expect(fixtureTest).toBeTypeOf("function");
    expect(defineIntegrationSuite).toBeTypeOf("function");
    expect(setTestPayloadConfig).toBeTypeOf("function");
  });

  it("exports MSW centralized handlers and server instance", () => {
    expect(server).toBeDefined();
    expect(Array.isArray(handlers)).toBeTruthy();
    expect(handlers.length).toBeGreaterThanOrEqual(8);
  });
});

describe("@repo/test-kit request helpers", () => {
  it("returns a typed PayloadRequest stub with custom user and headers", () => {
    const headers = new Headers({ "x-tenant-id": "store-42" });
    const user = { email: "merchant@example.com", id: 10 };
    const req = createTestReq({ headers, user });

    expect(req.user).toStrictEqual(user);
    expect(req.headers).toBe(headers);
    expect(req.headers.get("x-tenant-id")).toBe("store-42");
  });

  it("returns default empty headers and null user when options are omitted", () => {
    const req = createTestReq();

    expect(req.user).toBeNull();
    expect(req.headers).toBeInstanceOf(Headers);
    expect(req.headers.get("x-tenant-id")).toBeNull();
  });
});

describe("@repo/test-kit helper exports isolation", () => {
  it("keeps lower-level database lifecycle functions in helpers module", () => {
    expect(getSqliteMemoryUri("4")).toBe(
      "file:test_mem_4?mode=memory&cache=shared"
    );
    expect(createTestPayload).toBeTypeOf("function");
    expect(createAppTestPayload).toBeTypeOf("function");
  });
});
