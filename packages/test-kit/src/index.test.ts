import { describe, expect, it } from "vitest";

import {
  createIntegrationSuite,
  createIntegrationTest,
  integrationSuite,
  integrationTest,
} from "./index";
import { handlers, server } from "./msw";
import { createTestReq } from "./payload/createTestReq";

describe("@repo/test-kit public interface exports", () => {
  it("provides primary test suite and case runners", () => {
    expect(integrationSuite).toBeTypeOf("function");
    expect(integrationTest).toBeTypeOf("function");
    expect(createIntegrationSuite).toBeTypeOf("function");
    expect(createIntegrationTest).toBeTypeOf("function");
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
