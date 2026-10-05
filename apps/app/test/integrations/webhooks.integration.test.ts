import type { Payload } from "payload";
import type { Config, Order, Store } from "@repo/types";

import { multiTenantPlugin } from "@payloadcms/plugin-multi-tenant";
import { NextRequest } from "next/server";
import { expect } from "vitest";

import { POST } from "@/app/api/webhooks/[provider]/[storeSlug]/route";
import { Orders } from "@/payload/collections/orders";
import { Stores } from "@/payload/collections/stores";
import { Users } from "@/payload/collections/users";
import { generateMidtransSignature } from "@repo/commerce-adapters/payments";
import { encryptCredential } from "@repo/commerce-adapters/utils";
import { commercePlugin } from "@repo/payload-plugin-commerce";
import { describe, it, setTestPayloadConfig } from "@repo/test-kit";

const MIDTRANS_SERVER_KEY = "SB-Mid-server-TEST12345";
const XENDIT_SECRET_KEY = "xnd_development_secret_12345";
const XENDIT_WEBHOOK_TOKEN = "xnd_webhook_token_secret_54321";

const registerPayloadInstance = (payload: Payload): void => {
  if (!global._payload) {
    global._payload = new Map();
  }
  global._payload.set("default", {
    initializedCrons: true,
    payload,
    promise: null,
    reload: false,
    ws: null,
  });
};

interface SeedMidtransParams {
  orderNumber: string;
  payload: Payload;
  storeName: string;
  storeSlug: string;
  total: number;
}

interface SeedXenditParams {
  orderNumber: string;
  payload: Payload;
  storeName: string;
  storeSlug: string;
  total: number;
}

const seedMidtransFixture = async ({
  orderNumber,
  payload,
  storeName,
  storeSlug,
  total,
}: SeedMidtransParams): Promise<{ order: Order; store: Store }> => {
  const encryptedKey = encryptCredential(MIDTRANS_SERVER_KEY, payload.secret);

  // SAFETY: Stores collection create with valid data returns Store document.
  const store = (await payload.create({
    collection: "stores",
    data: {
      name: storeName,
      activePaymentProvider: "midtrans",
      slug: storeSlug,
      subscription: { status: "trial" },
      theme: "default",
    },
  })) as Store;

  await payload.create({
    collection: "storeCredentials",
    data: {
      midtrans: { serverKey: encryptedKey },
      paymentProvider: "midtrans",
      store: store.id,
    },
  });

  // SAFETY: Orders collection create with valid data returns Order document.
  const order = (await payload.create({
    collection: "orders",
    data: {
      currency: "IDR",
      orderNumber,
      paymentMetadata: null,
      paymentStatus: "pending",
      store: store.id,
      total,
    },
  })) as Order;

  return { order, store };
};

const seedXenditFixture = async ({
  orderNumber,
  payload,
  storeName,
  storeSlug,
  total,
}: SeedXenditParams): Promise<{ order: Order; store: Store }> => {
  const encryptedSecretKey = encryptCredential(
    XENDIT_SECRET_KEY,
    payload.secret
  );
  const encryptedWebhookToken = encryptCredential(
    XENDIT_WEBHOOK_TOKEN,
    payload.secret
  );

  // SAFETY: Stores collection create with valid data returns Store document.
  const store = (await payload.create({
    collection: "stores",
    data: {
      name: storeName,
      activePaymentProvider: "xendit",
      slug: storeSlug,
      subscription: { status: "trial" },
      theme: "default",
    },
  })) as Store;

  await payload.create({
    collection: "storeCredentials",
    data: {
      paymentProvider: "xendit",
      store: store.id,
      xendit: {
        secretKey: encryptedSecretKey,
        webhookToken: encryptedWebhookToken,
      },
    },
  });

  // SAFETY: Orders collection create with valid data returns Order document.
  const order = (await payload.create({
    collection: "orders",
    data: {
      currency: "IDR",
      orderNumber,
      paymentMetadata: null,
      paymentStatus: "pending",
      store: store.id,
      total,
    },
  })) as Order;

  return { order, store };
};

setTestPayloadConfig({
  collections: [Users, Stores, Orders],
  plugins: [
    commercePlugin({
      secret: (req) => req.payload.secret,
      slugs: {
        packages: "packages",
        storeCredentials: "storeCredentials",
        stores: "stores",
      },
    }),
    multiTenantPlugin<Config>({
      tenantSelectorLabel: "Store",
      tenantsSlug: "stores",
      collections: {
        orders: { isGlobal: false },
        storeCredentials: { customTenantField: true, isGlobal: false },
      },
      tenantField: {
        name: "store",
      },
      tenantsArrayField: {
        arrayFieldName: "stores",
        arrayTenantFieldName: "store",
        includeDefaultField: false,
      },
    }),
  ],
});

describe("Unified Webhook Route Handler (/api/webhooks/[provider]/[storeSlug])", () => {
  it("returns HTTP 404 Not Found for unsupported provider before Payload initialization", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe/toko-test",
      {
        body: JSON.stringify({ event: "charge.succeeded" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );

    const res = await POST(req, {
      params: Promise.resolve({ provider: "stripe", storeSlug: "toko-test" }),
    });

    expect(res.status).toBe(404);
    // SAFETY: HTTP 404 response body has a typed error message string.
    const data = (await res.json()) as { error: string };
    expect(data).toStrictEqual({ error: "Not found" });
  });

  it("resolves case-insensitive provider matching (e.g. Midtrans, Xendit) successfully", async ({
    payload,
  }) => {
    registerPayloadInstance(payload);

    await seedMidtransFixture({
      orderNumber: "ORDER-CASE-MIDTRANS",
      payload,
      storeName: "Toko Midtrans Case",
      storeSlug: "toko-midtrans-case",
      total: 100_000,
    });

    const midtransSignature = generateMidtransSignature(
      {
        gross_amount: "100000.00",
        order_id: "ORDER-CASE-MIDTRANS",
        status_code: "200",
      },
      MIDTRANS_SERVER_KEY
    );

    const midtransReq = new NextRequest(
      "http://localhost:3000/api/webhooks/Midtrans/toko-midtrans-case",
      {
        headers: { "content-type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          fraud_status: "accept",
          gross_amount: "100000.00",
          order_id: "ORDER-CASE-MIDTRANS",
          payment_type: "qris",
          signature_key: midtransSignature,
          status_code: "200",
          transaction_id: "tx-midtrans-case-1",
          transaction_status: "settlement",
        }),
      }
    );

    const midtransRes = await POST(midtransReq, {
      params: Promise.resolve({
        provider: "Midtrans",
        storeSlug: "toko-midtrans-case",
      }),
    });

    expect(midtransRes.status).toBe(200);

    await seedXenditFixture({
      orderNumber: "ORDER-CASE-XENDIT",
      payload,
      storeName: "Toko Xendit Case",
      storeSlug: "toko-xendit-case",
      total: 200_000,
    });

    const xenditReq = new NextRequest(
      "http://localhost:3000/api/webhooks/Xendit/toko-xendit-case",
      {
        method: "POST",
        body: JSON.stringify({
          id: "inv-case-xendit-1",
          amount: 200_000,
          external_id: "ORDER-CASE-XENDIT",
          status: "PAID",
        }),
        headers: {
          "content-type": "application/json",
          "x-callback-token": XENDIT_WEBHOOK_TOKEN,
        },
      }
    );

    const xenditRes = await POST(xenditReq, {
      params: Promise.resolve({
        provider: "Xendit",
        storeSlug: "toko-xendit-case",
      }),
    });

    expect(xenditRes.status).toBe(200);
  });

  it("returns HTTP 404 Not Found for unknown store slug", async ({
    payload,
  }) => {
    registerPayloadInstance(payload);

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/unknown-store",
      {
        body: JSON.stringify({ order_id: "ORDER-999" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );

    const res = await POST(req, {
      params: Promise.resolve({
        provider: "midtrans",
        storeSlug: "unknown-store",
      }),
    });

    expect(res.status).toBe(404);
    // SAFETY: HTTP 404 response body has a typed error message string.
    const data = (await res.json()) as { error: string };
    expect(data).toStrictEqual({ error: "Store not found" });
  });

  it("returns HTTP 400 Bad Request for mismatched active payment provider on Store", async ({
    payload,
  }) => {
    registerPayloadInstance(payload);

    // SAFETY: Stores collection create with valid data returns Store document.
    const store = (await payload.create({
      collection: "stores",
      data: {
        name: "Toko Provider Mismatch",
        activePaymentProvider: "xendit",
        slug: "toko-mismatch",
        subscription: { status: "trial" },
        theme: "default",
      },
    })) as Store;

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-mismatch",
      {
        body: JSON.stringify({ order_id: "ORDER-MISMATCH" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }
    );

    const res = await POST(req, {
      params: Promise.resolve({
        provider: "midtrans",
        storeSlug: store.slug,
      }),
    });

    expect(res.status).toBe(400);
    // SAFETY: HTTP 400 response body has a typed error message string.
    const data = (await res.json()) as { error: string };
    expect(data).toStrictEqual({
      error: "midtrans is not active for this store",
    });
  });

  it("transitions Order from pending to paid and persists payment metadata in SQLite for valid Midtrans webhook", async ({
    payload,
  }) => {
    registerPayloadInstance(payload);

    const { order, store } = await seedMidtransFixture({
      orderNumber: "ORDER-MIDTRANS-SETTLE",
      payload,
      storeName: "Toko Midtrans Valid",
      storeSlug: "toko-midtrans-valid",
      total: 175_000,
    });

    const signature = generateMidtransSignature(
      {
        gross_amount: "175000.00",
        order_id: "ORDER-MIDTRANS-SETTLE",
        status_code: "200",
      },
      MIDTRANS_SERVER_KEY
    );

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/midtrans/toko-midtrans-valid",
      {
        headers: { "content-type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          fraud_status: "accept",
          gross_amount: "175000.00",
          order_id: "ORDER-MIDTRANS-SETTLE",
          payment_type: "gopay",
          settlement_time: "2026-10-02 14:00:00",
          signature_key: signature,
          status_code: "200",
          transaction_id: "tx-midtrans-valid-100",
          transaction_status: "settlement",
          transaction_time: "2026-10-02 13:58:00",
        }),
      }
    );

    const res = await POST(req, {
      params: Promise.resolve({
        provider: "midtrans",
        storeSlug: store.slug,
      }),
    });

    expect(res.status).toBe(200);
    // SAFETY: Successful webhook processing returns orderId, paymentStatus, and OK status.
    const body = (await res.json()) as {
      orderId: string;
      paymentStatus: string;
      status: string;
    };
    expect(body.status).toBe("OK");
    expect(body.paymentStatus).toBe("paid");

    // SAFETY: Orders collection findByID returns Order document.
    const updatedOrder = (await payload.findByID({
      id: order.id,
      collection: "orders",
    })) as Order;

    expect(updatedOrder.paymentStatus).toBe("paid");
    expect(updatedOrder.paymentMetadata).toMatchObject({
      grossAmount: "175000.00",
      paymentType: "gopay",
      provider: "midtrans",
      transactionId: "tx-midtrans-valid-100",
    });
  });

  it("transitions Order from pending to paid and persists payment metadata in SQLite for valid Xendit invoice webhook", async ({
    payload,
  }) => {
    registerPayloadInstance(payload);

    const { order, store } = await seedXenditFixture({
      orderNumber: "ORDER-XENDIT-SETTLE",
      payload,
      storeName: "Toko Xendit Valid",
      storeSlug: "toko-xendit-valid",
      total: 350_000,
    });

    const req = new NextRequest(
      "http://localhost:3000/api/webhooks/xendit/toko-xendit-valid",
      {
        method: "POST",
        body: JSON.stringify({
          id: "inv-xendit-valid-200",
          amount: 350_000,
          created: "2026-10-02T15:00:00.000Z",
          currency: "IDR",
          description: "Payment for Order #ORDER-XENDIT-SETTLE",
          expiry_date: "2026-10-03T15:00:00.000Z",
          external_id: "ORDER-XENDIT-SETTLE",
          merchant_name: "Toko Xendit Valid",
          paid_amount: 350_000,
          paid_at: "2026-10-02T15:10:00.000Z",
          payer_email: "buyer@example.com",
          payment_channel: "BCA",
          payment_destination: "9876543210",
          payment_method: "BANK_TRANSFER",
          status: "PAID",
          updated: "2026-10-02T15:10:00.000Z",
          user_id: "user-xendit-12345",
        }),
        headers: {
          "content-type": "application/json",
          "x-callback-token": XENDIT_WEBHOOK_TOKEN,
        },
      }
    );

    const res = await POST(req, {
      params: Promise.resolve({
        provider: "xendit",
        storeSlug: store.slug,
      }),
    });

    expect(res.status).toBe(200);
    // SAFETY: Successful webhook processing returns orderId, paymentStatus, and OK status.
    const body = (await res.json()) as {
      orderId: string;
      paymentStatus: string;
      status: string;
    };
    expect(body.status).toBe("OK");
    expect(body.paymentStatus).toBe("paid");

    // SAFETY: Orders collection findByID returns Order document.
    const updatedOrder = (await payload.findByID({
      id: order.id,
      collection: "orders",
    })) as Order;

    expect(updatedOrder.paymentStatus).toBe("paid");
    expect(updatedOrder.paymentMetadata).toMatchObject({
      id: "inv-xendit-valid-200",
      amount: 350_000,
      provider: "xendit",
      status: "PAID",
    });
  });
});
