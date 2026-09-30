// @vitest-environment node
import { generateMidtransSignature } from "@repo/commerce-adapters/payments";
import { encryptCredential } from "@repo/commerce-adapters/utils";
import { preventPaymentStatusReversion } from "@repo/payload-plugin-commerce/hooks";
import type { Order, Store, StoreCredential } from "@repo/types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { env } from "@/env";

import { createMidtransWebhookHandler } from "./route";
import type {
  MidtransWebhookRouteHandler,
  WebhookOrderUpdateData,
  WebhookPayloadClient,
} from "./route";

const TEST_SECRET = env.PAYLOAD_SECRET;
const SERVER_KEY = "SB-Mid-server-TEST12345";
const ENCRYPTED_SERVER_KEY = encryptCredential(SERVER_KEY, TEST_SECRET);

interface FakePayloadDatabase {
  orders: Order[];
  storeCredentials: StoreCredential[];
  stores: Store[];
}

const createMockDatabase = (): FakePayloadDatabase => {
  const store: Store = {
    activePaymentProvider: "midtrans",
    createdAt: "2026-10-01T00:00:00.000Z",
    id: 1,
    name: "Toko Kopi Gayo",
    slug: "toko-kopi",
    theme: "default",
    updatedAt: "2026-10-01T00:00:00.000Z",
    subscription: {
      status: "active",
    },
  };

  const storeCredential: StoreCredential = {
    createdAt: "2026-10-01T00:00:00.000Z",
    id: 10,
    paymentProvider: "midtrans",
    store: 1,
    updatedAt: "2026-10-01T00:00:00.000Z",
    midtrans: {
      isProduction: false,
      serverKey: ENCRYPTED_SERVER_KEY,
    },
  };

  const order: Order = {
    createdAt: "2026-10-01T00:00:00.000Z",
    currency: "IDR",
    id: 100,
    orderNumber: "ORDER-1001",
    paymentStatus: "pending",
    store: 1,
    total: 150_000,
    updatedAt: "2026-10-01T00:00:00.000Z",
    customer: {
      email: "buyer@example.com",
      firstName: "Ahmad",
    },
  };

  return {
    orders: [order],
    storeCredentials: [storeCredential],
    stores: [store],
  };
};

interface OrderIdCondition {
  id?: { equals?: number };
}

interface OrderNumberCondition {
  orderNumber?: { equals?: string };
}

type OrderCondition = OrderIdCondition | OrderNumberCondition;

interface OrdersWhereClause {
  and?: {
    or?: OrderCondition[];
    store?: { equals?: number };
  }[];
}

const createMockPayloadClient = (
  db: FakePayloadDatabase,
  findCalls: { collection: string; overrideAccess?: boolean }[] = []
): WebhookPayloadClient => ({
  secret: TEST_SECRET,
  find: ({ collection, overrideAccess, where }) => {
    findCalls.push({ collection, overrideAccess });

    if (collection === "stores") {
      const slugEquals = (where as { slug?: { equals?: string } })?.slug
        ?.equals;
      const docs = db.stores.filter(
        (s) => !slugEquals || s.slug === slugEquals
      );
      return Promise.resolve({
        docs,
        hasNextPage: false,
        hasPrevPage: false,
        limit: docs.length,
        page: 1,
        pagingCounter: 1,
        totalDocs: docs.length,
        totalPages: 1,
      });
    }

    if (collection === "storeCredentials") {
      const storeEquals = (where as { store?: { equals?: number } })?.store
        ?.equals;
      const docs = db.storeCredentials.filter(
        (c) =>
          storeEquals === undefined ||
          c.store === storeEquals ||
          (typeof c.store === "object" && c.store?.id === storeEquals)
      );
      return Promise.resolve({
        docs,
        hasNextPage: false,
        hasPrevPage: false,
        limit: docs.length,
        page: 1,
        pagingCounter: 1,
        totalDocs: docs.length,
        totalPages: 1,
      });
    }

    if (collection === "orders") {
      let filtered = db.orders;
      const andClauses = (where as OrdersWhereClause)?.and;
      if (andClauses) {
        const storeClause = andClauses.find((c) => "store" in c);
        const orClause = andClauses.find((c) => "or" in c);
        if (storeClause?.store?.equals !== undefined) {
          filtered = filtered.filter(
            (o) =>
              o.store === storeClause.store?.equals ||
              (typeof o.store === "object" &&
                o.store?.id === storeClause.store?.equals)
          );
        }
        if (orClause?.or) {
          filtered = filtered.filter((o) =>
            orClause.or?.some(
              (cond) =>
                ("orderNumber" in cond &&
                  cond.orderNumber?.equals &&
                  o.orderNumber === cond.orderNumber.equals) ||
                ("id" in cond &&
                  cond.id?.equals !== undefined &&
                  o.id === cond.id.equals)
            )
          );
        }
      }

      return Promise.resolve({
        docs: filtered,
        hasNextPage: false,
        hasPrevPage: false,
        limit: filtered.length,
        page: 1,
        pagingCounter: 1,
        totalDocs: filtered.length,
        totalPages: 1,
      });
    }

    return Promise.resolve({
      docs: [],
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      pagingCounter: 1,
      totalDocs: 0,
      totalPages: 0,
    });
  },
  findByID: ({ collection, id }) => {
    if (collection === "orders") {
      const doc = db.orders.find(
        (o) => String(o.id) === String(id) || o.orderNumber === String(id)
      );
      if (!doc) {
        return Promise.reject(new Error("Order not found"));
      }
      return Promise.resolve(doc);
    }
    return Promise.reject(
      new Error(`Collection ${collection} findByID not mocked`)
    );
  },
  update: ({ collection, data, id }) => {
    if (collection === "orders") {
      const index = db.orders.findIndex(
        (o) => String(o.id) === String(id) || o.orderNumber === String(id)
      );
      if (index === -1) {
        return Promise.reject(new Error("Order not found"));
      }
      const originalDoc = db.orders[index];
      if (!originalDoc) {
        return Promise.reject(new Error("Order not found"));
      }

      // SAFETY: Minimal mock collection satisfies hook signature for testing.
      const mockCollection = { slug: "orders" } as never;
      // SAFETY: Minimal mock request satisfies hook signature for testing.
      const mockReq = {} as never;

      const hookData = preventPaymentStatusReversion({
        collection: mockCollection,
        context: {},
        data,
        operation: "update",
        originalDoc,
        req: mockReq,
      });
      // SAFETY: Hook returns sanitized WebhookOrderUpdateData.
      const validData = hookData as WebhookOrderUpdateData;

      const updated: Order = {
        ...originalDoc,
        ...validData,
        updatedAt: new Date().toISOString(),
      };
      db.orders[index] = updated;
      return Promise.resolve(updated);
    }
    return Promise.reject(
      new Error(`Collection ${collection} update not mocked`)
    );
  },
});

const createValidMidtransPayload = (
  overrides: Record<string, unknown> = {}
) => {
  const orderId = "ORDER-1001";
  const statusCode = "200";
  const grossAmount = "150000.00";
  const signatureKey = generateMidtransSignature(
    {
      gross_amount: grossAmount,
      order_id: orderId,
      status_code: statusCode,
    },
    SERVER_KEY
  );

  return {
    fraud_status: "accept",
    gross_amount: grossAmount,
    order_id: orderId,
    payment_type: "qris",
    signature_key: signatureKey,
    status_code: statusCode,
    transaction_id: "tx-midtrans-uuid-999",
    transaction_status: "settlement",
    transaction_time: "2026-10-01 12:00:00",
    ...overrides,
  };
};

describe("Midtrans Webhook Route Handler (/api/webhooks/midtrans/[storeSlug])", () => {
  let db: FakePayloadDatabase;
  let findCalls: { collection: string; overrideAccess?: boolean }[];
  let handler: MidtransWebhookRouteHandler;

  beforeEach(() => {
    db = createMockDatabase();
    findCalls = [];
    handler = createMidtransWebhookHandler(() =>
      Promise.resolve(createMockPayloadClient(db, findCalls))
    );
  });

  it("awaits params asynchronously and processes valid settlement webhook to paid", async () => {
    const webhookData = createValidMidtransPayload();
    const rawBody = JSON.stringify(webhookData);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: rawBody,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const params = Promise.resolve({ storeSlug: "toko-kopi" });
    const response = await handler(req, { params });

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      orderId: string;
      paymentStatus: string;
      status: string;
    };
    expect(json.status).toBe("OK");
    expect(json.orderId).toBe("ORDER-1001");
    expect(json.paymentStatus).toBe("paid");

    const updatedOrder = db.orders.find((o) => o.orderNumber === "ORDER-1001");
    expect(updatedOrder?.paymentStatus).toBe("paid");
  });

  it("queries tenant store and storeCredentials with overrideAccess: true", async () => {
    const webhookData = createValidMidtransPayload();
    const rawBody = JSON.stringify(webhookData);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: rawBody,
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    await handler(req, { params: Promise.resolve({ storeSlug: "toko-kopi" }) });

    const storeFind = findCalls.find((c) => c.collection === "stores");
    const credsFind = findCalls.find(
      (c) => c.collection === "storeCredentials"
    );
    expect(storeFind?.overrideAccess).toBeTruthy();
    expect(credsFind?.overrideAccess).toBeTruthy();
  });

  it("preserves exact decimal string gross_amount without numeric coercion", async () => {
    const orderId = "ORDER-1001";
    const statusCode = "200";
    const grossAmount = "150000.00";
    const correctSignature = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      SERVER_KEY
    );

    const payload = createValidMidtransPayload({
      gross_amount: grossAmount,
      signature_key: correctSignature,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(200);
  });

  it("rejects webhook when signature is invalid using timingSafeEqualString", async () => {
    const payload = createValidMidtransPayload({
      signature_key:
        "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(401);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Invalid Midtrans signature");
  });

  it("rejects request if store does not exist", async () => {
    const payload = createValidMidtransPayload();

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/unknown-store",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "unknown-store" }),
    });

    expect(response.status).toBe(404);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Store not found");
  });

  it("rejects request if store.activePaymentProvider !== 'midtrans'", async () => {
    const [store] = db.stores;
    if (store) {
      store.activePaymentProvider = "xendit";
    }

    const payload = createValidMidtransPayload();

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain("Midtrans is not active");
  });

  it("handles canonical transitions for expire and failure", async () => {
    const orderId = "ORDER-1001";
    const statusCode = "202";
    const grossAmount = "150000.00";
    const expireSignature = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      SERVER_KEY
    );

    const payload = createValidMidtransPayload({
      signature_key: expireSignature,
      status_code: statusCode,
      transaction_status: "expire",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      orderId: string;
      paymentStatus: string;
      status: string;
    };
    expect(json.paymentStatus).toBe("expired");

    const updatedOrder = db.orders.find((o) => o.orderNumber === "ORDER-1001");
    expect(updatedOrder?.paymentStatus).toBe("expired");
  });

  it("rejects illegal state reversion from paid to expired or failed", async () => {
    const [order] = db.orders;
    if (order) {
      order.paymentStatus = "paid";
    }

    const orderId = "ORDER-1001";
    const statusCode = "202";
    const grossAmount = "150000.00";
    const expireSignature = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      SERVER_KEY
    );

    const payload = createValidMidtransPayload({
      signature_key: expireSignature,
      status_code: statusCode,
      transaction_status: "expire",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain("terminal state 'paid'");
    expect(db.orders[0]?.paymentStatus).toBe("paid");
  });

  it("permits idempotent replay when order is already paid", async () => {
    const [order] = db.orders;
    if (order) {
      order.paymentStatus = "paid";
    }

    const payload = createValidMidtransPayload({
      transaction_status: "settlement",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      orderId: string;
      paymentStatus: string;
      status: string;
    };
    expect(json.status).toBe("OK");
    expect(json.paymentStatus).toBe("paid");
  });

  it("rejects non-JSON raw body with 400 Bad Request", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: "not-json-content",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Invalid JSON body");
  });
});
