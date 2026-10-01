import type { PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { paymentMetadataField } from "./paymentMetadata";

const createMockReq = (user: PayloadRequest["user"]): PayloadRequest => {
  const req = { user };
  // SAFETY: Test mock satisfies PayloadRequest interface needed by access checks.
  return req as PayloadRequest;
};

describe("paymentMetadata field definition", () => {
  it("defines json field named paymentMetadata", () => {
    expect(paymentMetadataField.name).toBe("paymentMetadata");
    expect(paymentMetadataField.type).toBe("json");
  });

  it("configures admin read permissions requiring authenticated user", () => {
    const readAccess = paymentMetadataField.access?.read;
    const mockAdminReq = createMockReq({
      collection: "users",
      email: "admin@example.com",
      id: "user-1",
    });
    const mockAnonReq = createMockReq(null);

    const canReadAdmin =
      typeof readAccess === "function"
        ? readAccess({ req: mockAdminReq } as never)
        : false;
    const canReadAnon =
      typeof readAccess === "function"
        ? readAccess({ req: mockAnonReq } as never)
        : true;

    expect(canReadAdmin).toBeTruthy();
    expect(canReadAnon).toBeFalsy();
  });

  it("configures admin update permissions requiring authenticated user", () => {
    const updateAccess = paymentMetadataField.access?.update;
    const mockAdminReq = createMockReq({
      collection: "users",
      email: "admin@example.com",
      id: "user-1",
    });
    const mockAnonReq = createMockReq(null);

    const canUpdateAdmin =
      typeof updateAccess === "function"
        ? updateAccess({ req: mockAdminReq } as never)
        : false;
    const canUpdateAnon =
      typeof updateAccess === "function"
        ? updateAccess({ req: mockAnonReq } as never)
        : true;

    expect(canUpdateAdmin).toBeTruthy();
    expect(canUpdateAnon).toBeFalsy();
  });
});
