import { describe, expect, it } from "vitest";

import { createTestReq } from "./helpers";
import {
  describe as fixtureDescribe,
  it as fixtureIt,
  setTestPayloadConfig,
} from "./index";

describe("@repo/test-kit fixture exports", () => {
  it("provides describe test suite runner", () => {
    expect(fixtureDescribe).toBeTypeOf("function");
  });

  it("provides it test case runner", () => {
    expect(fixtureIt).toBeTypeOf("function");
  });

  it("provides setTestPayloadConfig helper", () => {
    expect(setTestPayloadConfig).toBeTypeOf("function");
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
