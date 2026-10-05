import type { FieldHookArgs, Payload } from "payload";

import { describe, expect, it, vi } from "vitest";

import {
  backfillOrdersPaymentMetadata,
  populatePaymentMetadataAfterRead,
  resolveLegacyPaymentMetadata,
} from "./backfillPaymentMetadata";

const createMockFieldHookArgs = (
  value: unknown,
  doc: Record<string, unknown>
): FieldHookArgs => {
  const args = {
    blockData: undefined,
    collection: null as never,
    context: {},
    data: doc,
    field: null as never,
    findMany: false,
    global: null as never,
    indexPath: [],
    operation: "read" as const,
    originalDoc: doc,
    path: ["paymentMetadata"],
    req: null as never,
    schemaPath: [],
    siblingData: doc,
    siblingFields: [],
    value,
  };
  // SAFETY: Mock field hook arguments satisfy FieldHookArgs interface for test execution.
  return args as FieldHookArgs;
};

const createMockPayload = (
  find: (args: never) => Promise<unknown>,
  update: (args: never) => Promise<unknown>
): Payload => {
  const payload = { find, update };
  // SAFETY: Mock payload satisfies Payload contract for migration backfill tests.
  return payload as Payload;
};

describe(resolveLegacyPaymentMetadata, () => {
  it("returns null when order has no legacy payment groups or metadata", () => {
    const order = {
      id: 1,
      orderNumber: "ORDER-001",
    };
    expect(resolveLegacyPaymentMetadata(order)).toBeNull();
  });

  it("returns existing paymentMetadata when already populated", () => {
    const existing = {
      provider: "midtrans",
      transactionId: "trx-existing-123",
    };
    const order = {
      id: 2,
      orderNumber: "ORDER-002",
      paymentMetadata: existing,
    };
    expect(resolveLegacyPaymentMetadata(order)).toStrictEqual(existing);
  });

  it("migrates midtrans group into polymorphic paymentMetadata", () => {
    const order = {
      id: 3,
      orderNumber: "ORDER-003",
      midtrans: {
        grossAmount: "150000.00",
        paymentType: "qris",
        settlementTime: "2026-10-01 10:00:00",
        transactionId: "midtrans-trx-456",
      },
    };

    const result = resolveLegacyPaymentMetadata(order);
    expect(result).toStrictEqual({
      grossAmount: "150000.00",
      paymentType: "qris",
      provider: "midtrans",
      settlementTime: "2026-10-01 10:00:00",
      transactionId: "midtrans-trx-456",
    });
  });

  it("migrates xendit group into polymorphic paymentMetadata", () => {
    const order = {
      id: 4,
      orderNumber: "ORDER-004",
      xendit: {
        amount: 250_000,
        externalId: "ext-order-004",
        invoiceId: "xendit-inv-789",
        paidAt: "2026-10-01T10:30:00Z",
        paymentChannel: "BCA",
        paymentMethod: "POOL",
        status: "PAID",
      },
    };

    const result = resolveLegacyPaymentMetadata(order);
    expect(result).toStrictEqual({
      amount: 250_000,
      externalId: "ext-order-004",
      invoiceId: "xendit-inv-789",
      paidAt: "2026-10-01T10:30:00Z",
      paymentChannel: "BCA",
      paymentMethod: "POOL",
      provider: "xendit",
      status: "PAID",
    });
  });

  it("ignores empty legacy groups with only null/undefined values", () => {
    const order = {
      id: 5,
      orderNumber: "ORDER-005",
      midtrans: {
        grossAmount: null,
        paymentType: null,
        settlementTime: null,
        transactionId: null,
      },
      xendit: {
        amount: null,
        invoiceId: null,
      },
    };
    expect(resolveLegacyPaymentMetadata(order)).toBeNull();
  });
});

describe(populatePaymentMetadataAfterRead, () => {
  it("returns existing value when present", () => {
    const existing = { provider: "custom", transactionId: "123" };
    const hookArgs = createMockFieldHookArgs(existing, {
      id: 1,
      orderNumber: "ORDER-1",
    });
    expect(populatePaymentMetadataAfterRead(hookArgs)).toStrictEqual(existing);
  });

  it("resolves legacy payment metadata when field value is null or undefined", () => {
    const hookArgs = createMockFieldHookArgs(null, {
      id: 1,
      orderNumber: "ORDER-1",
      midtrans: {
        transactionId: "midtrans-abc",
      },
    });
    expect(populatePaymentMetadataAfterRead(hookArgs)).toStrictEqual({
      provider: "midtrans",
      transactionId: "midtrans-abc",
    });
  });

  it("resolves legacy payment metadata when field value is empty object", () => {
    const hookArgs = createMockFieldHookArgs(
      {},
      {
        id: 1,
        orderNumber: "ORDER-1",
        midtrans: {
          transactionId: "midtrans-empty-obj",
        },
      }
    );
    expect(populatePaymentMetadataAfterRead(hookArgs)).toStrictEqual({
      provider: "midtrans",
      transactionId: "midtrans-empty-obj",
    });
  });
});

describe(backfillOrdersPaymentMetadata, () => {
  it("backfills legacy midtrans and xendit orders via Payload find and update", async () => {
    const mockOrders = [
      {
        id: 1,
        orderNumber: "ORDER-001",
        paymentMetadata: null,
        midtrans: {
          grossAmount: "100000.00",
          transactionId: "mid-1",
        },
      },
      {
        id: 2,
        orderNumber: "ORDER-002",
        paymentMetadata: { provider: "already-set" },
        xendit: {
          invoiceId: "xen-2",
        },
      },
      {
        id: 3,
        orderNumber: "ORDER-003",
        paymentMetadata: null,
      },
      {
        id: 4,
        orderNumber: "ORDER-004",
        paymentMetadata: null,
        xendit: {
          amount: 50_000,
          invoiceId: "xen-4",
          status: "PAID",
        },
      },
    ];

    const findMock = vi
      .fn<(args: unknown) => Promise<unknown>>()
      .mockResolvedValue({
        docs: mockOrders,
        hasNextPage: false,
        page: 1,
        totalPages: 1,
      });
    const updateMock = vi
      .fn<(args: unknown) => Promise<unknown>>()
      .mockResolvedValue({});

    const mockPayload = createMockPayload(findMock, updateMock);

    const result = await backfillOrdersPaymentMetadata(mockPayload);

    // doc 2 (already set) and doc 3 (no legacy data) skipped
    // doc 1 and doc 4 updated
    expect(result).toStrictEqual({
      skipped: 2,
      total: 4,
      updated: 2,
    });

    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "orders",
        overrideAccess: true,
      })
    );

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledWith({
      id: 1,
      collection: "orders",
      overrideAccess: true,
      data: {
        paymentMetadata: {
          grossAmount: "100000.00",
          provider: "midtrans",
          transactionId: "mid-1",
        },
      },
    });
    expect(updateMock).toHaveBeenCalledWith({
      id: 4,
      collection: "orders",
      overrideAccess: true,
      data: {
        paymentMetadata: {
          amount: 50_000,
          invoiceId: "xen-4",
          provider: "xendit",
          status: "PAID",
        },
      },
    });
  });

  it("handles multi-page pagination during backfill", async () => {
    const page1 = [
      {
        id: 10,
        midtrans: { transactionId: "page1-mid" },
        orderNumber: "ORD-10",
      },
    ];
    const page2 = [
      {
        id: 20,
        orderNumber: "ORD-20",
        xendit: { invoiceId: "page2-xen" },
      },
    ];

    const findMock = vi
      .fn<({ page }: { page: number }) => Promise<unknown>>()
      .mockImplementation(({ page }: { page: number }) => {
        if (page === 1) {
          return Promise.resolve({
            docs: page1,
            hasNextPage: true,
            page: 1,
          });
        }
        return Promise.resolve({
          docs: page2,
          hasNextPage: false,
          page: 2,
        });
      });

    const updateMock = vi
      .fn<(args: unknown) => Promise<unknown>>()
      .mockResolvedValue({});
    const mockPayload = createMockPayload(findMock, updateMock);

    const result = await backfillOrdersPaymentMetadata(mockPayload, {
      batchSize: 1,
    });

    expect(result.total).toBe(2);
    expect(result.updated).toBe(2);
    expect(findMock).toHaveBeenCalledTimes(2);
    expect(updateMock).toHaveBeenCalledTimes(2);
  });
});
