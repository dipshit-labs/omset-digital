import {
  generateMidtransSignature,
  generateXenditHmacSignature,
} from "@repo/commerce-adapters/payments";
import { encryptCredential } from "@repo/commerce-adapters/utils";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { processIncomingWebhook, resolveCredential } from "./pipeline";
import type { WebhookPayloadClient } from "./pipeline";

interface WhereEquals {
  equals?: unknown;
}

interface WhereObj {
  and?: WhereObj[];
  id?: WhereEquals;
  orderNumber?: WhereEquals;
  or?: WhereObj[];
  slug?: WhereEquals;
  store?: WhereEquals;
}

const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === "object" && val !== null;

const asWhereObj = (val: unknown): WhereObj | undefined =>
  isObject(val) ? (val as WhereObj) : undefined;

interface MockDb {
  orders: Record<string, unknown>[];
  storeCredentials: Record<string, unknown>[];
  stores: Record<string, unknown>[];
}

const createMockPayload = (db: Partial<MockDb> = {}): WebhookPayloadClient => {
  const stores = db.stores ?? [];
  const storeCredentials = db.storeCredentials ?? [];
  const orders = db.orders ?? [];

  const find = vi.fn<WebhookPayloadClient["find"]>(
    ({
      collection,
      where,
    }: {
      collection: string;
      depth?: number;
      limit?: number;
      overrideAccess?: boolean;
      where?: unknown;
    }) => {
      const whereObj = asWhereObj(where);
      if (collection === "stores") {
        const slugEquals = whereObj?.slug?.equals;
        const matched = stores.filter(
          (s) => !slugEquals || s.slug === slugEquals
        );
        return Promise.resolve({ docs: matched });
      }

      if (collection === "storeCredentials") {
        const storeEquals = whereObj?.store?.equals;
        const matched = storeCredentials.filter(
          (c) => storeEquals === undefined || c.store === storeEquals
        );
        return Promise.resolve({ docs: matched });
      }

      if (collection === "orders") {
        const andFilters = whereObj?.and ?? [];
        let matched = [...orders];

        for (const filter of andFilters) {
          if (filter.store) {
            const storeEquals = filter.store.equals;
            matched = matched.filter((o) => {
              if (storeEquals === undefined) {
                return true;
              }
              const orderStoreId =
                isObject(o.store) && "id" in o.store ? o.store.id : o.store;
              return orderStoreId === storeEquals;
            });
          }
          if (filter.or) {
            const orConditions = filter.or;
            matched = matched.filter((o) =>
              orConditions.some((cond) => {
                if (cond.orderNumber) {
                  return o.orderNumber === cond.orderNumber.equals;
                }
                if (cond.id) {
                  return o.id === cond.id.equals;
                }
                return false;
              })
            );
          }
        }

        return Promise.resolve({ docs: matched });
      }

      return Promise.resolve({ docs: [] });
    }
  );

  const update = vi.fn<WebhookPayloadClient["update"]>(() =>
    Promise.resolve({})
  );

  return {
    find,
    secret: "test-secret-at-least-32-characters-long",
    update,
  };
};

describe(resolveCredential, () => {
  const secret = "test-secret-at-least-32-characters-long";

  it("returns plaintext unchanged", () => {
    expect(resolveCredential("plain-api-key", secret)).toBe("plain-api-key");
  });

  it("decrypts versioned ciphertext using secret", () => {
    const encrypted = encryptCredential("super-secret-merchant-key", secret);
    expect(resolveCredential(encrypted, secret)).toBe(
      "super-secret-merchant-key"
    );
  });

  it("returns undefined for null or undefined", () => {
    expect(resolveCredential(undefined, secret)).toBeUndefined();
    expect(resolveCredential(null, secret)).toBeUndefined();
  });

  it("returns undefined when ciphertext decryption fails", () => {
    const encrypted = encryptCredential("super-secret-merchant-key", secret);
    expect(
      resolveCredential(encrypted, "wrong-secret-32-chars-long-12345")
    ).toBeUndefined();
  });
});

describe("processIncomingWebhook - Slice 1: Store resolution & provider status", () => {
  it("returns 404 when tenant store is not found", async () => {
    const payload = createMockPayload({ stores: [] });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/unknown-store",
      {
        body: JSON.stringify({}),
        method: "POST",
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      storeSlug: "unknown-store",
    });

    expect(res.status).toBe(404);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Store not found");
    expect(payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "stores",
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { slug: { equals: "unknown-store" } },
      })
    );
  });

  it("returns 400 when store.activePaymentProvider does not match provider", async () => {
    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "xendit", id: 1, slug: "toko-kopi" }],
    });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify({}),
        method: "POST",
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(400);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/midtrans is not active for this store/iu);
  });
});

describe("processIncomingWebhook - Slice 2: Credentials resolution & adapter dispatch", () => {
  const secret = "test-secret-at-least-32-characters-long";
  const rawServerKey = "SB-Mid-server-TEST123";

  it("returns 400 when storeCredentials document is missing", async () => {
    const payload = createMockPayload({
      storeCredentials: [],
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
    });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify({}),
        method: "POST",
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(400);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/credentials not configured/iu);
  });

  it("returns 400 when Midtrans serverKey is missing", async () => {
    const payload = createMockPayload({
      storeCredentials: [{ midtrans: {}, store: 1 }],
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
    });
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify({}),
        method: "POST",
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(400);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/midtrans credentials not configured/iu);
  });

  it("decrypts encrypted credentials and dispatches Midtrans webhook to adapter", async () => {
    const encryptedServerKey = encryptCredential(rawServerKey, secret);
    const orderId = "ORDER-101";
    const grossAmount = "150000.00";
    const statusCode = "200";

    const signatureKey = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      rawServerKey
    );

    const webhookPayload = {
      fraud_status: "accept",
      gross_amount: grossAmount,
      order_id: orderId,
      payment_type: "bank_transfer",
      signature_key: signatureKey,
      status_code: statusCode,
      transaction_id: "trx-mid-999",
      transaction_status: "settlement",
    };

    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
      orders: [
        {
          id: 101,
          orderNumber: orderId,
          paymentStatus: "pending",
          store: 1,
        },
      ],
      storeCredentials: [
        {
          midtrans: { serverKey: encryptedServerKey },
          store: 1,
        },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: JSON.stringify(webhookPayload),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(200);
    // SAFETY: Successful response returns orderId and paymentStatus.
    const data = (await res.json()) as {
      orderId: string;
      paymentStatus: string;
    };
    expect(data.orderId).toBe(orderId);
    expect(data.paymentStatus).toBe("paid");
  });

  it("decrypts encrypted credentials and dispatches Xendit webhook to adapter", async () => {
    const rawWebhookToken = "xendit-token-secret-123";
    const encryptedToken = encryptCredential(rawWebhookToken, secret);
    const orderId = "ORDER-202";

    const webhookPayload = {
      amount: 250_000,
      created: "2026-10-01T10:00:00.000Z",
      external_id: orderId,
      id: "inv-xen-202",
      paid_at: "2026-10-01T10:05:00.000Z",
      payment_channel: "BCA",
      payment_method: "BANK_TRANSFER",
      status: "PAID",
    };

    const rawBody = JSON.stringify(webhookPayload);
    const signature = generateXenditHmacSignature(rawBody, rawWebhookToken);

    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "xendit", id: 2, slug: "toko-kopi" }],
      orders: [
        {
          id: 202,
          orderNumber: orderId,
          paymentStatus: "pending",
          store: 2,
        },
      ],
      storeCredentials: [
        {
          store: 2,
          xendit: { webhookToken: encryptedToken },
        },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: rawBody,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-callback-signature": signature,
        },
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "xendit",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(200);
    // SAFETY: Successful response returns orderId and paymentStatus.
    const data = (await res.json()) as {
      orderId: string;
      paymentStatus: string;
    };
    expect(data.orderId).toBe(orderId);
    expect(data.paymentStatus).toBe("paid");
  });
});

describe("processIncomingWebhook - Slice 3: Error handling & order lookup", () => {
  const secret = "test-secret-at-least-32-characters-long";
  const rawServerKey = "SB-Mid-server-TEST123";
  const encryptedServerKey = encryptCredential(rawServerKey, secret);

  it("returns 401 when Midtrans signature is invalid", async () => {
    const payload = createMockPayload({
      orders: [{ id: 1, orderNumber: "ORDER-401", store: 1 }],
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
      storeCredentials: [
        { midtrans: { serverKey: encryptedServerKey }, store: 1 },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        method: "POST",
        body: JSON.stringify({
          gross_amount: "10000.00",
          order_id: "ORDER-401",
          signature_key: "invalid-signature-digest",
          status_code: "200",
          transaction_status: "settlement",
        }),
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(401);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/signature/iu);
  });

  it("returns 401 when Xendit callback verification fails", async () => {
    const rawWebhookToken = "xendit-token-123";
    const encryptedToken = encryptCredential(rawWebhookToken, secret);

    const payload = createMockPayload({
      orders: [{ id: 2, orderNumber: "ORDER-401-X", store: 2 }],
      stores: [{ activePaymentProvider: "xendit", id: 2, slug: "toko-kopi" }],
      storeCredentials: [
        { store: 2, xendit: { webhookToken: encryptedToken } },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        method: "POST",
        body: JSON.stringify({
          amount: 50_000,
          external_id: "ORDER-401-X",
          id: "inv-401",
          status: "PAID",
        }),
        headers: {
          "x-callback-token": "wrong-token",
        },
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "xendit",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(401);
  });

  it("returns 400 when raw body is invalid JSON", async () => {
    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
      storeCredentials: [
        { midtrans: { serverKey: encryptedServerKey }, store: 1 },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        body: "not-json-content",
        method: "POST",
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(400);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/malformed|invalid json/iu);
  });

  it("returns 404 when order is not found for the store", async () => {
    const orderId = "ORDER-404";
    const grossAmount = "50000.00";
    const statusCode = "200";
    const signatureKey = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      rawServerKey
    );

    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
      orders: [
        // Order belongs to a different store (cross-tenant attack)
        { id: 404, orderNumber: orderId, store: 999 },
      ],
      storeCredentials: [
        { midtrans: { serverKey: encryptedServerKey }, store: 1 },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        method: "POST",
        body: JSON.stringify({
          gross_amount: grossAmount,
          order_id: orderId,
          signature_key: signatureKey,
          status_code: statusCode,
          transaction_status: "settlement",
        }),
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(404);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Order not found");
  });
});

describe("processIncomingWebhook - Slice 4: Terminal-state idempotency guard", () => {
  const secret = "test-secret-at-least-32-characters-long";
  const rawServerKey = "SB-Mid-server-TEST123";
  const encryptedServerKey = encryptCredential(rawServerKey, secret);

  const terminalStatuses = ["paid", "expired", "failed", "cancelled"] as const;

  it.each(terminalStatuses)(
    "short-circuits with 200 OK without database mutation when order is already %s",
    async (terminalStatus) => {
      const orderId = `ORDER-${terminalStatus.toUpperCase()}`;
      const grossAmount = "75000.00";
      const statusCode = "200";
      const signatureKey = generateMidtransSignature(
        {
          gross_amount: grossAmount,
          order_id: orderId,
          status_code: statusCode,
        },
        rawServerKey
      );

      const payload = createMockPayload({
        orders: [
          {
            id: 99,
            orderNumber: orderId,
            paymentMetadata: { initial: true, provider: "midtrans" },
            paymentStatus: terminalStatus,
            store: 1,
          },
        ],
        storeCredentials: [
          { midtrans: { serverKey: encryptedServerKey }, store: 1 },
        ],
        stores: [
          { activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" },
        ],
      });

      const req = new NextRequest(
        "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
        {
          method: "POST",
          body: JSON.stringify({
            gross_amount: grossAmount,
            order_id: orderId,
            signature_key: signatureKey,
            status_code: statusCode,
            transaction_status: "settlement",
          }),
        }
      );

      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      const res = await processIncomingWebhook({
        payload,
        provider: "midtrans",
        req,
        secret,
        storeSlug: "toko-kopi",
      });

      expect(res.status).toBe(200);
      // SAFETY: Successful response returns orderId, paymentStatus, and status.
      const data = (await res.json()) as {
        orderId: string;
        paymentStatus: string;
        status: string;
      };
      expect(data).toMatchObject({
        orderId,
        paymentStatus: terminalStatus,
        status: "OK",
      });
      expect(payload.update).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(expect.stringMatching(/terminal/iu));

      infoSpy.mockRestore();
    }
  );
});

describe("processIncomingWebhook - Slice 5: State mutation & paymentMetadata persistence", () => {
  const secret = "test-secret-at-least-32-characters-long";
  const rawServerKey = "SB-Mid-server-TEST123";
  const encryptedServerKey = encryptCredential(rawServerKey, secret);

  it("updates Order paymentStatus and merges providerEventId into paymentMetadata for Midtrans", async () => {
    const orderId = "ORDER-MUTATE-1";
    const grossAmount = "120000.00";
    const statusCode = "200";
    const signatureKey = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      rawServerKey
    );

    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
      orders: [
        {
          id: 55,
          orderNumber: orderId,
          paymentMetadata: { initialSessionId: "sess-123" },
          paymentStatus: "pending",
          store: 1,
        },
      ],
      storeCredentials: [
        { midtrans: { serverKey: encryptedServerKey }, store: 1 },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        method: "POST",
        body: JSON.stringify({
          fraud_status: "accept",
          gross_amount: grossAmount,
          order_id: orderId,
          payment_type: "qris",
          settlement_time: "2026-10-01 10:00:00",
          signature_key: signatureKey,
          status_code: statusCode,
          transaction_id: "trx-mid-555",
          transaction_status: "settlement",
        }),
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(200);
    expect(payload.update).toHaveBeenCalledExactlyOnceWith({
      collection: "orders",
      id: 55,
      overrideAccess: true,
      data: {
        paymentStatus: "paid",
        paymentMetadata: expect.objectContaining({
          grossAmount: "120000.00",
          initialSessionId: "sess-123",
          paymentType: "qris",
          provider: "midtrans",
          providerEventId: "trx-mid-555",
          transactionId: "trx-mid-555",
        }),
      },
    });
  });

  it("updates Order paymentStatus and merges providerEventId into paymentMetadata for Xendit", async () => {
    const rawWebhookToken = "xendit-token-555";
    const encryptedToken = encryptCredential(rawWebhookToken, secret);
    const orderId = "ORDER-MUTATE-2";

    const webhookPayload = {
      amount: 300_000,
      created: "2026-10-01T10:00:00.000Z",
      external_id: orderId,
      id: "inv-xen-777",
      paid_at: "2026-10-01T10:02:00.000Z",
      payment_channel: "QRIS",
      payment_method: "QR_CODE",
      status: "PAID",
    };

    const rawBody = JSON.stringify(webhookPayload);
    const signature = generateXenditHmacSignature(rawBody, rawWebhookToken);

    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "xendit", id: 2, slug: "toko-kopi" }],
      orders: [
        {
          id: 77,
          orderNumber: orderId,
          paymentMetadata: null,
          paymentStatus: "pending",
          store: 2,
        },
      ],
      storeCredentials: [
        { store: 2, xendit: { webhookToken: encryptedToken } },
      ],
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-kopi",
      {
        body: rawBody,
        method: "POST",
        headers: {
          "x-callback-signature": signature,
        },
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "xendit",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(200);
    expect(payload.update).toHaveBeenCalledExactlyOnceWith({
      collection: "orders",
      id: 77,
      overrideAccess: true,
      data: {
        paymentStatus: "paid",
        paymentMetadata: expect.objectContaining({
          paymentChannel: "QRIS",
          paymentMethod: "QR_CODE",
          provider: "xendit",
          providerEventId: "inv-xen-777",
        }),
      },
    });
  });

  it("returns 500 when database update fails on recoverable infrastructure error", async () => {
    const orderId = "ORDER-FAIL-DB";
    const grossAmount = "50000.00";
    const statusCode = "200";
    const signatureKey = generateMidtransSignature(
      {
        gross_amount: grossAmount,
        order_id: orderId,
        status_code: statusCode,
      },
      rawServerKey
    );

    const payload = createMockPayload({
      stores: [{ activePaymentProvider: "midtrans", id: 1, slug: "toko-kopi" }],
      orders: [
        {
          id: 88,
          orderNumber: orderId,
          paymentStatus: "pending",
          store: 1,
        },
      ],
      storeCredentials: [
        { midtrans: { serverKey: encryptedServerKey }, store: 1 },
      ],
    });

    vi.spyOn(payload, "update").mockRejectedValue(
      new Error("Database connection lost")
    );

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-kopi",
      {
        method: "POST",
        body: JSON.stringify({
          gross_amount: grossAmount,
          order_id: orderId,
          signature_key: signatureKey,
          status_code: statusCode,
          transaction_status: "settlement",
        }),
      }
    );

    const res = await processIncomingWebhook({
      payload,
      provider: "midtrans",
      req,
      secret,
      storeSlug: "toko-kopi",
    });

    expect(res.status).toBe(500);
    // SAFETY: Error response returns JSON error payload.
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Database connection lost");
  });
});
