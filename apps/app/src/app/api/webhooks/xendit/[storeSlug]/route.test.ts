// @vitest-environment node
import { generateXenditHmacSignature } from "@repo/commerce-adapters/payments";
import { encryptCredential } from "@repo/commerce-adapters/utils";
import { preventPaymentStatusReversion } from "@repo/payload-plugin-commerce/hooks";
import type { Order, Store, StoreCredential } from "@repo/types";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { env } from "@/env";

import { createXenditWebhookHandler } from "./route";
import type {
  WebhookOrderUpdateData,
  WebhookPayloadClient,
  XenditWebhookRouteHandler,
} from "./route";

const TEST_SECRET = env.PAYLOAD_SECRET;
const SECRET_KEY = "xnd_development_secret_12345";
const WEBHOOK_TOKEN = "xnd_webhook_token_secret_54321";
const ENCRYPTED_SECRET_KEY = encryptCredential(SECRET_KEY, TEST_SECRET);
const ENCRYPTED_WEBHOOK_TOKEN = encryptCredential(WEBHOOK_TOKEN, TEST_SECRET);

interface FakePayloadDatabase {
  orders: Order[];
  storeCredentials: StoreCredential[];
  stores: Store[];
}

const createMockDatabase = (): FakePayloadDatabase => {
  const store: Store = {
    activePaymentProvider: "xendit",
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
    paymentProvider: "xendit",
    store: 1,
    updatedAt: "2026-10-01T00:00:00.000Z",
    xendit: {
      isProduction: false,
      secretKey: ENCRYPTED_SECRET_KEY,
      webhookToken: ENCRYPTED_WEBHOOK_TOKEN,
    },
  };

  const order: Order = {
    createdAt: "2026-10-01T00:00:00.000Z",
    currency: "IDR",
    id: 100,
    orderNumber: "ORDER-2001",
    paymentStatus: "pending",
    store: 1,
    total: 250_000,
    updatedAt: "2026-10-01T00:00:00.000Z",
    customer: {
      email: "buyer@example.com",
      firstName: "Siti",
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
      return Promise.resolve({ docs });
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
      return Promise.resolve({ docs });
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

      return Promise.resolve({ docs: filtered });
    }

    return Promise.resolve({ docs: [] });
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
        xendit: validData.xendit
          ? {
              amount: validData.xendit.amount ?? null,
              externalId: validData.xendit.externalId ?? null,
              invoiceId: validData.xendit.invoiceId ?? null,
              paidAt: validData.xendit.paidAt ?? null,
              paymentChannel: validData.xendit.paymentChannel ?? null,
              paymentMethod: validData.xendit.paymentMethod ?? null,
              status: validData.xendit.status ?? null,
            }
          : originalDoc.xendit,
      };
      db.orders[index] = updated;
      return Promise.resolve(updated);
    }

    return Promise.reject(
      new Error(`Collection ${collection} update not mocked`)
    );
  },
});

const createValidXenditInvoicePayload = (
  overrides: Record<string, unknown> = {}
) => ({
  amount: 250_000,
  created: "2026-10-01T10:00:00.000Z",
  currency: "IDR",
  description: "Payment for Order #ORDER-2001",
  expiry_date: "2026-10-02T10:00:00.000Z",
  external_id: "ORDER-2001",
  id: "inv_651234567890abcdef",
  merchant_name: "Toko Kopi Gayo",
  paid_amount: 250_000,
  paid_at: "2026-10-01T10:05:00.000Z",
  payer_email: "buyer@example.com",
  payment_channel: "BCA",
  payment_destination: "1234567890",
  payment_method: "BANK_TRANSFER",
  status: "PAID",
  updated: "2026-10-01T10:05:00.000Z",
  user_id: "user_6500000000000000",
  ...overrides,
});

describe("Xendit Webhook Route Handler (/api/webhooks/xendit/[storeSlug])", () => {
  let db: FakePayloadDatabase;
  let findCalls: { collection: string; overrideAccess?: boolean }[];
  let handler: XenditWebhookRouteHandler;

  beforeEach(() => {
    db = createMockDatabase();
    findCalls = [];
    handler = createXenditWebhookHandler(() =>
      Promise.resolve(createMockPayloadClient(db, findCalls))
    );
  });

  it("awaits params asynchronously and processes valid legacy x-callback-token to paid", async () => {
    const webhookData = createValidXenditInvoicePayload();
    const rawBody = JSON.stringify(webhookData);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: rawBody,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
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
    expect(json).toMatchObject({
      orderId: "ORDER-2001",
      paymentStatus: "paid",
      status: "OK",
    });

    const updatedOrder = db.orders.find((o) => o.orderNumber === "ORDER-2001");
    expect(updatedOrder?.paymentStatus).toBe("paid");
    expect(updatedOrder?.xendit?.invoiceId).toBe("inv_651234567890abcdef");
  });

  it("awaits params asynchronously and processes valid modern x-callback-signature HMAC to paid", async () => {
    const webhookData = createValidXenditInvoicePayload();
    const rawBody = JSON.stringify(webhookData);
    const hmacSignature = generateXenditHmacSignature(rawBody, WEBHOOK_TOKEN);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: rawBody,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-signature": hmacSignature,
        },
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
    expect(json.paymentStatus).toBe("paid");
  });

  it("queries tenant store and storeCredentials with overrideAccess: true", async () => {
    const webhookData = createValidXenditInvoicePayload();
    const rawBody = JSON.stringify(webhookData);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: rawBody,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
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

  it("rejects webhook when store does not exist", async () => {
    const webhookData = createValidXenditInvoicePayload();
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/non-existent-store",
      {
        body: JSON.stringify(webhookData),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "non-existent-store" }),
    });

    expect(response.status).toBe(404);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Store not found");
  });

  it("rejects webhook when store.activePaymentProvider !== 'xendit'", async () => {
    const store = db.stores.find((s) => s.slug === "toko-kopi");
    if (store) {
      store.activePaymentProvider = "midtrans";
    }

    const payload = createValidXenditInvoicePayload();

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Xendit is not active for this store");
  });

  it("rejects webhook when verification headers are missing", async () => {
    const payload = createValidXenditInvoicePayload();

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
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
    expect(json.error).toBe("Missing Xendit verification headers");
  });

  it("rejects webhook when legacy callback token is tampered/mismatched", async () => {
    const payload = createValidXenditInvoicePayload();

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": "wrong-token-value",
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(401);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Invalid Xendit callback token");
  });

  it("rejects webhook when HMAC signature is tampered", async () => {
    const payload = createValidXenditInvoicePayload();

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-signature":
            "0000000000000000000000000000000000000000000000000000000000000000",
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(401);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Invalid Xendit HMAC signature");
  });

  it("rejects webhook when raw body is tampered after HMAC generation", async () => {
    const originalPayload = createValidXenditInvoicePayload();
    const originalBody = JSON.stringify(originalPayload);
    const hmacSignature = generateXenditHmacSignature(
      originalBody,
      WEBHOOK_TOKEN
    );

    const tamperedPayload = {
      ...originalPayload,
      amount: 10_000,
    };
    const tamperedBody = JSON.stringify(tamperedPayload);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: tamperedBody,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-signature": hmacSignature,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(401);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Invalid Xendit HMAC signature");
  });

  it("returns 400 when raw body is empty or invalid JSON", async () => {
    const emptyReq = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: "",
        headers: { "x-callback-token": WEBHOOK_TOKEN },
        method: "POST",
      }
    );

    const emptyRes = await handler(emptyReq, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });
    expect(emptyRes.status).toBe(400);

    const invalidJsonReq = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: "{ bad json",
        headers: { "x-callback-token": WEBHOOK_TOKEN },
        method: "POST",
      }
    );

    const invalidRes = await handler(invalidJsonReq, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });
    expect(invalidRes.status).toBe(400);
  });

  it("returns 404 when referenced order is not found", async () => {
    const payload = createValidXenditInvoicePayload({
      external_id: "NON-EXISTENT-ORDER",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(404);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBe("Order not found");
  });

  it("transitions order status to expired when Xendit sends EXPIRED", async () => {
    const payload = createValidXenditInvoicePayload({ status: "EXPIRED" });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as { paymentStatus: string };
    expect(json.paymentStatus).toBe("expired");
    expect(
      db.orders.find((o) => o.orderNumber === "ORDER-2001")?.paymentStatus
    ).toBe("expired");
  });

  it("transitions order status to failed when Xendit sends FAILED", async () => {
    const payload = createValidXenditInvoicePayload({ status: "FAILED" });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as { paymentStatus: string };
    expect(json.paymentStatus).toBe("failed");
    expect(
      db.orders.find((o) => o.orderNumber === "ORDER-2001")?.paymentStatus
    ).toBe("failed");
  });

  it("transitions order status to cancelled when Xendit sends CANCELLED", async () => {
    const payload = createValidXenditInvoicePayload({ status: "CANCELLED" });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(200);
    const json = (await response.json()) as { paymentStatus: string };
    expect(json.paymentStatus).toBe("cancelled");
    expect(
      db.orders.find((o) => o.orderNumber === "ORDER-2001")?.paymentStatus
    ).toBe("cancelled");
  });

  it("rejects transition attempting to reverse terminal status via collection hook", async () => {
    // 1. Order is already in terminal state 'paid'
    const order = db.orders.find((o) => o.orderNumber === "ORDER-2001");
    if (order) {
      order.paymentStatus = "paid";
    }

    // 2. Incoming webhook tries to transition to 'expired'
    const payload = createValidXenditInvoicePayload({ status: "EXPIRED" });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: JSON.stringify(payload),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-callback-token": WEBHOOK_TOKEN,
        },
      }
    );

    const response = await handler(req, {
      params: Promise.resolve({ storeSlug: "toko-kopi" }),
    });

    expect(response.status).toBe(400);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain("terminal state 'paid'");
    expect(
      db.orders.find((o) => o.orderNumber === "ORDER-2001")?.paymentStatus
    ).toBe("paid");
  });
});
