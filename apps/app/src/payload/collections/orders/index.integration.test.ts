import type { LegacyOrderRecord } from "@repo/payload-plugin-commerce/types";
import type { Order } from "@repo/types";
// @vitest-environment node
import type { JSONField, PayloadRequest } from "payload";
import { describe, expect, it } from "vitest";

import { Orders } from "./index";

type LegacyTestOrder = Order & LegacyOrderRecord;

const createMockUserReq = (user: PayloadRequest["user"]): PayloadRequest => {
  const req = { user };
  // SAFETY: Test mock satisfies PayloadRequest interface needed by hooks and access functions.
  return req as PayloadRequest;
};

const runOrderAfterReadHooks = (
  orderDoc: LegacyTestOrder,
  req: PayloadRequest
): Order => {
  const serialized = JSON.stringify(orderDoc);
  // SAFETY: Parsing serialized Order document produces a mutable plain record for hook execution.
  const result = JSON.parse(serialized) as Record<string, unknown>;

  for (const field of Orders.fields) {
    if ("name" in field && "hooks" in field && field.hooks?.afterRead) {
      const fieldName = field.name;
      let fieldValue = result[fieldName];

      for (const hook of field.hooks.afterRead) {
        // SAFETY: Invoking afterRead hook with mock hook arguments matching signature.
        fieldValue = hook({
          context: {},
          data: result,
          field,
          findMany: false,
          originalDoc: result,
          path: [fieldName],
          req,
          siblingData: result,
          value: fieldValue,
        } as never);
      }

      result[fieldName] = fieldValue;
    }
  }

  return {
    // SAFETY: Legacy test record satisfies Order shape for afterRead evaluation.
    ...(orderDoc as Order),
    ...result,
  };
};

interface TestPayloadClient {
  create: (args: {
    collection: "orders";
    data: Partial<Order>;
    req?: PayloadRequest;
  }) => Promise<Order>;
  findByID: (args: {
    collection: "orders";
    id: number | string;
    req?: PayloadRequest;
  }) => Promise<Order | null>;
  update: (args: {
    collection: "orders";
    data: Partial<Order>;
    id: number | string;
    req?: PayloadRequest;
  }) => Promise<Order>;
}

const createTestOrderPayloadClient = (
  initialOrders: Order[] = []
): TestPayloadClient => {
  const db: Order[] = [...initialOrders];
  let nextId = db.length + 1;

  const defaultReq = createMockUserReq({
    collection: "users",
    createdAt: "2026-10-01T00:00:00Z",
    email: "admin@example.com",
    id: 1,
    updatedAt: "2026-10-01T00:00:00Z",
  });

  return {
    create: ({ data, req = defaultReq }) => {
      const orderId = typeof data.id === "number" ? data.id : nextId;
      nextId += 1;

      const newDoc: Order = {
        createdAt: "2026-10-01T12:00:00Z",
        currency: data.currency ?? "IDR",
        id: orderId,
        orderNumber: data.orderNumber ?? `ORDER-${orderId}`,
        paymentMetadata: data.paymentMetadata ?? null,
        paymentStatus: data.paymentStatus ?? "pending",
        total: data.total ?? 0,
        updatedAt: "2026-10-01T12:00:00Z",
        ...data,
      };

      db.push(newDoc);
      return Promise.resolve(runOrderAfterReadHooks(newDoc, req));
    },

    findByID: ({ id, req = defaultReq }) => {
      const found = db.find((o) => String(o.id) === String(id));
      if (!found) {
        return Promise.resolve(null);
      }
      return Promise.resolve(runOrderAfterReadHooks(found, req));
    },

    update: ({ data, id, req = defaultReq }) => {
      const index = db.findIndex((o) => String(o.id) === String(id));
      if (index === -1) {
        return Promise.reject(new Error(`Order ${id} not found`));
      }
      const existing = db[index];
      if (!existing) {
        return Promise.reject(new Error(`Order ${id} not found`));
      }

      const updatedDoc: Order = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      db[index] = updatedDoc;
      return Promise.resolve(runOrderAfterReadHooks(updatedDoc, req));
    },
  };
};

describe("Orders Collection paymentMetadata Integration", () => {
  it("persists arbitrary Midtrans payment metadata cleanly via collection create and find", async () => {
    const client = createTestOrderPayloadClient();
    const midtransMetadata = {
      grossAmount: "175000.00",
      paymentType: "gopay",
      provider: "midtrans",
      settlementTime: "2026-10-01T12:00:00Z",
      transactionId: "midtrans-order-001-tx",
    };

    await client.create({
      collection: "orders",
      data: {
        currency: "IDR",
        id: 1,
        orderNumber: "ORDER-1001",
        paymentMetadata: midtransMetadata,
        paymentStatus: "paid",
        total: 175_000,
      },
    });

    const retrieved = await client.findByID({ collection: "orders", id: 1 });
    expect(retrieved).toBeDefined();
    expect(retrieved?.paymentMetadata).toStrictEqual(midtransMetadata);
  });

  it("persists arbitrary Xendit payment metadata cleanly via collection create and find", async () => {
    const client = createTestOrderPayloadClient();
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

    await client.create({
      collection: "orders",
      data: {
        currency: "IDR",
        id: 2,
        orderNumber: "ORDER-1002",
        paymentMetadata: xenditMetadata,
        paymentStatus: "paid",
        total: 320_000,
      },
    });

    const retrieved = await client.findByID({ collection: "orders", id: 2 });
    expect(retrieved).toBeDefined();
    expect(retrieved?.paymentMetadata).toStrictEqual(xenditMetadata);
  });

  it("persists arbitrary future third-party gateway metadata with audit logs", async () => {
    const client = createTestOrderPayloadClient();
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

    await client.create({
      collection: "orders",
      data: {
        currency: "IDR",
        id: 3,
        orderNumber: "ORDER-1003",
        paymentMetadata: customGatewayMetadata,
        paymentStatus: "paid",
        total: 150_000,
      },
    });

    const retrieved = await client.findByID({ collection: "orders", id: 3 });
    expect(retrieved).toBeDefined();
    expect(retrieved?.paymentMetadata).toStrictEqual(customGatewayMetadata);
  });

  it("updates existing order paymentMetadata with transition details via collection update", async () => {
    const client = createTestOrderPayloadClient();

    await client.create({
      collection: "orders",
      data: {
        currency: "IDR",
        id: 4,
        orderNumber: "ORDER-1004",
        paymentMetadata: null,
        paymentStatus: "pending",
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

    await client.update({
      collection: "orders",
      id: 4,
      data: {
        paymentMetadata: updatedMetadata,
        paymentStatus: "paid",
      },
    });

    const retrieved = await client.findByID({ collection: "orders", id: 4 });
    expect(retrieved?.paymentStatus).toBe("paid");
    expect(retrieved?.paymentMetadata).toStrictEqual(updatedMetadata);
  });

  it("automatically backfills legacy midtrans data on read through afterRead hook", () => {
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

    const mockReq = createMockUserReq({
      collection: "users",
      createdAt: "2026-10-01T00:00:00Z",
      email: "admin@example.com",
      id: 1,
      updatedAt: "2026-10-01T00:00:00Z",
    });

    const readOrder = runOrderAfterReadHooks(legacyOrder, mockReq);

    expect(readOrder.paymentMetadata).toStrictEqual({
      grossAmount: "85000.00",
      paymentType: "bank_transfer",
      provider: "midtrans",
      settlementTime: "2026-10-01 08:30:00",
      transactionId: "legacy-mid-555",
    });
  });

  it("automatically backfills legacy xendit data on read through afterRead hook", () => {
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

    const mockReq = createMockUserReq({
      collection: "users",
      createdAt: "2026-10-01T00:00:00Z",
      email: "admin@example.com",
      id: 1,
      updatedAt: "2026-10-01T00:00:00Z",
    });

    const readOrder = runOrderAfterReadHooks(legacyOrder, mockReq);

    expect(readOrder.paymentMetadata).toStrictEqual({
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
    const paymentMetadataField = Orders.fields.find(
      (f) => "name" in f && f.name === "paymentMetadata" && f.type === "json"
    ) as JSONField | undefined;

    expect(paymentMetadataField).toBeDefined();

    const authReq = createMockUserReq({
      collection: "users",
      createdAt: "2026-10-01T00:00:00Z",
      email: "merchant@example.com",
      id: 1,
      updatedAt: "2026-10-01T00:00:00Z",
    });
    const unauthReq = createMockUserReq(null);

    const readFn = paymentMetadataField?.access?.read;
    const canReadAuth =
      typeof readFn === "function" ? readFn({ req: authReq } as never) : false;
    const canReadUnauth =
      typeof readFn === "function" ? readFn({ req: unauthReq } as never) : true;

    expect(canReadAuth).toBeTruthy();
    expect(canReadUnauth).toBeFalsy();
  });

  it("enforces admin update access control on paymentMetadata field", () => {
    const paymentMetadataField = Orders.fields.find(
      (f) => "name" in f && f.name === "paymentMetadata" && f.type === "json"
    ) as JSONField | undefined;

    expect(paymentMetadataField).toBeDefined();

    const authReq = createMockUserReq({
      collection: "users",
      createdAt: "2026-10-01T00:00:00Z",
      email: "merchant@example.com",
      id: 1,
      updatedAt: "2026-10-01T00:00:00Z",
    });
    const unauthReq = createMockUserReq(null);

    const updateFn = paymentMetadataField?.access?.update;
    const canUpdateAuth =
      typeof updateFn === "function"
        ? updateFn({ req: authReq } as never)
        : false;
    const canUpdateUnauth =
      typeof updateFn === "function"
        ? updateFn({ req: unauthReq } as never)
        : true;

    expect(canUpdateAuth).toBeTruthy();
    expect(canUpdateUnauth).toBeFalsy();
  });
});
