import { defineIntegrationSuite } from "@repo/test-kit";
import { expect } from "vitest";

import { Orders } from "@/payload/collections/orders";

const { describe, it } = defineIntegrationSuite({
  collections: [Orders],
});

describe("Orders Collection paymentMetadata Integration", () => {
  it("persists arbitrary Midtrans payment metadata cleanly via collection create and find", async ({
    payload,
  }) => {
    const midtransMetadata = {
      grossAmount: "175000.00",
      paymentType: "gopay",
      provider: "midtrans",
      settlementTime: "2026-10-01T12:00:00Z",
      transactionId: "midtrans-order-001-tx",
    };

    const created = await payload.create({
      collection: "orders",
      data: {
        currency: "IDR",
        orderNumber: "ORDER-1001",
        paymentMetadata: midtransMetadata,
        paymentStatus: "paid",
        store: 1,
        total: 175_000,
      },
    });

    const retrieved = await payload.findByID({
      collection: "orders",
      id: created.id,
    });
    expect(retrieved).toBeDefined();
    expect(retrieved.paymentMetadata).toStrictEqual(midtransMetadata);
  });

  it("persists arbitrary Xendit payment metadata cleanly via collection create and find", async ({
    payload,
  }) => {
    const xenditMetadata = {
      amount: 320_000,
      externalId: "ext-order-1002",
      invoiceId: "xendit-inv-6677",
      paidAt: "2026-10-01T14:15:00Z",
      paymentChannel: "BNI",
      paymentMethod: "VIRTUAL_ACCOUNT",
      provider: "xendit",
      status: "PAID",
    };

    const created = await payload.create({
      collection: "orders",
      data: {
        currency: "IDR",
        orderNumber: "ORDER-1002",
        paymentMetadata: xenditMetadata,
        paymentStatus: "paid",
        store: 1,
        total: 320_000,
      },
    });

    const retrieved = await payload.findByID({
      collection: "orders",
      id: created.id,
    });
    expect(retrieved).toBeDefined();
    expect(retrieved.paymentMetadata).toStrictEqual(xenditMetadata);
  });

  it("persists arbitrary future third-party gateway metadata with audit logs", async ({
    payload,
  }) => {
    const customGatewayMetadata = {
      feeAmount: 4500,
      gatewayReference: "DOKU-TX-998877",
      paymentChannel: "QRIS_STATIS",
      provider: "doku",
      auditEvents: [
        { status: "initiated", timestamp: "2026-10-01T15:00:00Z" },
        { status: "captured", timestamp: "2026-10-01T15:02:10Z" },
      ],
    };

    const created = await payload.create({
      collection: "orders",
      data: {
        currency: "IDR",
        orderNumber: "ORDER-1003",
        paymentMetadata: customGatewayMetadata,
        paymentStatus: "paid",
        store: 1,
        total: 150_000,
      },
    });

    const retrieved = await payload.findByID({
      collection: "orders",
      id: created.id,
    });
    expect(retrieved).toBeDefined();
    expect(retrieved.paymentMetadata).toStrictEqual(customGatewayMetadata);
  });

  it("updates existing order paymentMetadata with transition details via collection update", async ({
    payload,
  }) => {
    const created = await payload.create({
      collection: "orders",
      data: {
        currency: "IDR",
        orderNumber: "ORDER-1004",
        paymentMetadata: null,
        paymentStatus: "pending",
        store: 1,
        total: 500_000,
      },
    });

    const updatedMetadata = {
      attemptCount: 1,
      paymentChannel: "SHOPEEPAY",
      provider: "midtrans",
      settlementTime: "2026-10-01T10:05:00Z",
      transactionId: "trx-shopee-4433",
    };

    await payload.update({
      collection: "orders",
      id: created.id,
      data: {
        paymentMetadata: updatedMetadata,
        paymentStatus: "paid",
      },
    });

    const retrieved = await payload.findByID({
      collection: "orders",
      id: created.id,
    });
    expect(retrieved.paymentStatus).toBe("paid");
    expect(retrieved.paymentMetadata).toStrictEqual(updatedMetadata);
  });
});
