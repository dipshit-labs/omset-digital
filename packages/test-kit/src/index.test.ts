import { describe, expect, it } from "vitest";

import {
  createAppTestPayload,
  createTestDatabase,
  createTestPayload,
  createTestReq,
  defineIntegrationSuite,
  destroyTestPayload,
  describe as fixtureDescribe,
  it as fixtureIt,
  test as fixtureTest,
  integrationSuite,
  integrationTest,
  resetDatabase,
  setTestPayloadConfig,
} from "./index";
import { handlers, server } from "./msw";
import { createPgLiteAdapter } from "./payload/database/pglite";
import { getPostgresWorkerSchemaName } from "./payload/database/postgres";

describe("@repo/test-kit public interface exports", () => {
  it("provides primary test suite and case runners", () => {
    expect(fixtureDescribe).toBeTypeOf("function");
    expect(fixtureIt).toBeTypeOf("function");
    expect(fixtureTest).toBeTypeOf("function");
    expect(integrationSuite).toBeTypeOf("function");
    expect(integrationTest).toBeTypeOf("function");
  });

  it("maintains backward-compatible legacy test exports", () => {
    expect(defineIntegrationSuite).toBeTypeOf("function");
    expect(setTestPayloadConfig).toBeTypeOf("function");
  });

  it("exports MSW centralized handlers and server instance", () => {
    expect(server).toBeDefined();
    expect(Array.isArray(handlers)).toBeTruthy();
    expect(handlers.length).toBeGreaterThanOrEqual(8);
  });

  it("exports canonical payload and database lifecycle functions", () => {
    expect(createTestPayload).toBeTypeOf("function");
    expect(destroyTestPayload).toBeTypeOf("function");
    expect(resetDatabase).toBeTypeOf("function");
    expect(createTestDatabase).toBeTypeOf("function");
  });
});

describe("@repo/test-kit request helpers", () => {
  it("returns a typed PayloadRequest stub with custom user and headers", () => {
    const headers = new Headers({ "x-tenant-id": "store-42" });
    const user = { id: 10, email: "merchant@example.com" };
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
  it("keeps lower-level database lifecycle functions in database module", () => {
    expect(getPostgresWorkerSchemaName("4")).toBe("test_worker_4");
    expect(createPgLiteAdapter).toBeTypeOf("function");
    expect(createAppTestPayload).toBeTypeOf("function");
  });
});
