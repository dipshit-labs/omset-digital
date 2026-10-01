// @vitest-environment node
import { preventPaymentStatusReversion } from "@repo/payload-plugin-commerce/hooks";
import type { Field, JSONField, PayloadRequest, SelectField } from "payload";
import { describe, expect, it } from "vitest";

import { canWrite } from "@/payload/access/canWrite";
import { enforceStoreOnCreate } from "@/payload/hooks/enforceStoreOnCreate";

import { Orders } from "./index";

const createMockReq = (user: PayloadRequest["user"]): PayloadRequest => {
  const req = { user };
  // SAFETY: Minimal mock request satisfies PayloadRequest interface for access testing.
  return req as PayloadRequest;
};

describe("Orders collection", () => {
  it("defines standard order collection configuration", () => {
    expect(Orders.slug).toBe("orders");
    expect(Orders.admin?.useAsTitle).toBe("orderNumber");
  });

  it("configures tenant scoping and state reversion prevention hooks", () => {
    expect(Orders.hooks?.beforeChange).toContain(enforceStoreOnCreate);
    expect(Orders.hooks?.beforeValidate).toContain(
      preventPaymentStatusReversion
    );
  });

  it("configures access control with canWrite", () => {
    expect(Orders.access?.create).toBe(canWrite);
    expect(Orders.access?.read).toBe(canWrite);
    expect(Orders.access?.update).toBe(canWrite);
    expect(Orders.access?.delete).toBe(canWrite);
  });

  it("contains orderNumber, paymentStatus, total, and customer fields", () => {
    const { fields } = Orders;

    const orderNumberField = fields.find(
      (f: Field) => "name" in f && f.name === "orderNumber" && f.type === "text"
    );
    const paymentStatusField = fields.find(
      (f: Field) =>
        "name" in f && f.name === "paymentStatus" && f.type === "select"
    ) as SelectField | undefined;
    const totalField = fields.find(
      (f: Field) => "name" in f && f.name === "total" && f.type === "number"
    );

    expect(orderNumberField).toBeDefined();
    expect(paymentStatusField).toBeDefined();
    expect(totalField).toBeDefined();

    const options = paymentStatusField?.options ?? [];
    const optionValues = options.map((opt: unknown) => {
      if (typeof opt === "string") {
        return opt;
      }
      if (opt && typeof opt === "object" && "value" in opt) {
        return String(opt.value);
      }
      return "";
    });

    expect(optionValues).toContain("pending");
  });

  it("contains midtrans and xendit gateway integration groups", () => {
    const { fields } = Orders;
    const midtransGroup = fields.find(
      (f: Field) => "name" in f && f.name === "midtrans" && f.type === "group"
    );
    const xenditGroup = fields.find(
      (f: Field) => "name" in f && f.name === "xendit" && f.type === "group"
    );

    expect(midtransGroup).toBeDefined();
    expect(xenditGroup).toBeDefined();
  });

  it("contains paymentMetadata json field", () => {
    const { fields } = Orders;
    const paymentMetadata = fields.find(
      (f: Field) =>
        "name" in f && f.name === "paymentMetadata" && f.type === "json"
    );

    expect(paymentMetadata).toBeDefined();
  });

  it("configures paymentMetadata admin read and update permissions", () => {
    const { fields } = Orders;
    const paymentMetadata = fields.find(
      (f: Field) =>
        "name" in f && f.name === "paymentMetadata" && f.type === "json"
    ) as JSONField | undefined;

    const readAccess = paymentMetadata?.access?.read;
    const updateAccess = paymentMetadata?.access?.update;

    const adminReq = createMockReq({
      collection: "users",
      createdAt: "2026-10-01T00:00:00Z",
      email: "admin@example.com",
      id: 1,
      updatedAt: "2026-10-01T00:00:00Z",
    });
    const anonReq = createMockReq(null);

    const canReadAdmin =
      typeof readAccess === "function"
        ? readAccess({ req: adminReq } as never)
        : false;
    const canReadAnon =
      typeof readAccess === "function"
        ? readAccess({ req: anonReq } as never)
        : true;
    const canUpdateAdmin =
      typeof updateAccess === "function"
        ? updateAccess({ req: adminReq } as never)
        : false;
    const canUpdateAnon =
      typeof updateAccess === "function"
        ? updateAccess({ req: anonReq } as never)
        : true;

    expect(canReadAdmin).toBeTruthy();
    expect(canReadAnon).toBeFalsy();
    expect(canUpdateAdmin).toBeTruthy();
    expect(canUpdateAnon).toBeFalsy();
  });
});
