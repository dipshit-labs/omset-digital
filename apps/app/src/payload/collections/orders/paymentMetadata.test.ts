import type { LegacyOrderRecord } from "@repo/payload-plugin-commerce/types";
import { createTestReq } from "@repo/test-kit";
import type { Order } from "@repo/types";
import type { JSONField } from "payload";
import { describe, expect, it } from "vitest";

import { Orders } from "./index";

type LegacyTestOrder = Order & LegacyOrderRecord;

const paymentMetadataField = Orders.fields.find(
  (field) =>
    "name" in field && field.name === "paymentMetadata" && field.type === "json"
) as JSONField | undefined;

describe("Orders paymentMetadata unit tests", () => {
  it("automatically backfills legacy midtrans data on read through afterRead hook", () => {
    expect(paymentMetadataField).toBeDefined();
    const afterReadHook = paymentMetadataField?.hooks?.afterRead?.[0];
    expect(afterReadHook).toBeDefined();

    const legacyOrder: LegacyTestOrder = {
      createdAt: "2026-10-01T08:00:00Z",
      currency: "IDR",
      id: 5,
      orderNumber: "ORDER-1005",
      paymentMetadata: null,
      paymentStatus: "paid",
      total: 85_000,
      updatedAt: "2026-10-01T08:30:00Z",
      midtrans: {
        grossAmount: "85000.00",
        paymentType: "bank_transfer",
        settlementTime: "2026-10-01 08:30:00",
        transactionId: "legacy-mid-555",
      },
    };

    const req = createTestReq({
      user: {
        collection: "users",
        createdAt: "2026-10-01T00:00:00Z",
        email: "admin@example.com",
        id: 1,
        updatedAt: "2026-10-01T00:00:00Z",
      },
    });

    // SAFETY: Invoking afterRead hook with typed test arguments matching FieldHook interface.
    const result = afterReadHook?.({
      context: {},
      data: legacyOrder,
      field: paymentMetadataField,
      findMany: false,
      originalDoc: legacyOrder,
      path: ["paymentMetadata"],
      req,
      siblingData: legacyOrder,
      value: null,
    } as never);

    expect(result).toStrictEqual({
      grossAmount: "85000.00",
      paymentType: "bank_transfer",
      provider: "midtrans",
      settlementTime: "2026-10-01 08:30:00",
      transactionId: "legacy-mid-555",
    });
  });

  it("automatically backfills legacy xendit data on read through afterRead hook", () => {
    expect(paymentMetadataField).toBeDefined();
    const afterReadHook = paymentMetadataField?.hooks?.afterRead?.[0];
    expect(afterReadHook).toBeDefined();

    const legacyOrder: LegacyTestOrder = {
      createdAt: "2026-10-01T09:00:00Z",
      currency: "IDR",
      id: 6,
      orderNumber: "ORDER-1006",
      paymentMetadata: null,
      paymentStatus: "paid",
      total: 120_000,
      updatedAt: "2026-10-01T09:15:00Z",
      xendit: {
        amount: 120_000,
        externalId: "legacy-ord-1006",
        invoiceId: "legacy-xendit-666",
        paidAt: "2026-10-01T09:15:00Z",
        paymentChannel: "MANDIRI",
        paymentMethod: "VIRTUAL_ACCOUNT",
        status: "PAID",
      },
    };

    const req = createTestReq({
      user: {
        collection: "users",
        createdAt: "2026-10-01T00:00:00Z",
        email: "admin@example.com",
        id: 1,
        updatedAt: "2026-10-01T00:00:00Z",
      },
    });

    // SAFETY: Invoking afterRead hook with typed test arguments matching FieldHook interface.
    const result = afterReadHook?.({
      context: {},
      data: legacyOrder,
      field: paymentMetadataField,
      findMany: false,
      originalDoc: legacyOrder,
      path: ["paymentMetadata"],
      req,
      siblingData: legacyOrder,
      value: null,
    } as never);

    expect(result).toStrictEqual({
      amount: 120_000,
      externalId: "legacy-ord-1006",
      invoiceId: "legacy-xendit-666",
      paidAt: "2026-10-01T09:15:00Z",
      paymentChannel: "MANDIRI",
      paymentMethod: "VIRTUAL_ACCOUNT",
      provider: "xendit",
      status: "PAID",
    });
  });

  it("enforces admin read access control on paymentMetadata field", () => {
    expect(paymentMetadataField).toBeDefined();

    const authReq = createTestReq({
      user: {
        collection: "users",
        createdAt: "2026-10-01T00:00:00Z",
        email: "merchant@example.com",
        id: 1,
        updatedAt: "2026-10-01T00:00:00Z",
      },
    });
    const unauthReq = createTestReq({ user: null });

    const readFn = paymentMetadataField?.access?.read;
    // SAFETY: Invoking field read access function with test request stub.
    const canReadAuth =
      typeof readFn === "function" ? readFn({ req: authReq } as never) : false;
    // SAFETY: Invoking field read access function with test request stub without user.
    const canReadUnauth =
      typeof readFn === "function" ? readFn({ req: unauthReq } as never) : true;

    expect(canReadAuth).toBeTruthy();
    expect(canReadUnauth).toBeFalsy();
  });

  it("enforces admin update access control on paymentMetadata field", () => {
    expect(paymentMetadataField).toBeDefined();

    const authReq = createTestReq({
      user: {
        collection: "users",
        createdAt: "2026-10-01T00:00:00Z",
        email: "merchant@example.com",
        id: 1,
        updatedAt: "2026-10-01T00:00:00Z",
      },
    });
    const unauthReq = createTestReq({ user: null });

    const updateFn = paymentMetadataField?.access?.update;
    // SAFETY: Invoking field update access function with test request stub.
    const canUpdateAuth =
      typeof updateFn === "function"
        ? updateFn({ req: authReq } as never)
        : false;
    // SAFETY: Invoking field update access function with test request stub without user.
    const canUpdateUnauth =
      typeof updateFn === "function"
        ? updateFn({ req: unauthReq } as never)
        : true;

    expect(canUpdateAuth).toBeTruthy();
    expect(canUpdateUnauth).toBeFalsy();
  });
});
