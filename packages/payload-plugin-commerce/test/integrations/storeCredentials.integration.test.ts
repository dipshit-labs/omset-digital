import type { CollectionConfig, Payload } from "payload";
import type { StoreCredentials } from "../../src/types";

import { expect } from "vitest";

import { decryptCredential, isCiphertext } from "@repo/commerce-adapters/utils";
import { defineIntegrationSuite } from "@repo/test-kit";
import { createStoreCredentialsCollection } from "../../src/collections/storeCredentials";
import { storeCredentialsFactory } from "../factories/storeCredentialsFactory";

const TEST_SECRET = "omset-digital-test-master-secret-32-chars!";

const storesCollection: CollectionConfig = {
  slug: "stores",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "slug", type: "text", required: true },
    { name: "theme", type: "text" },
    {
      name: "subscription",
      type: "group",
      fields: [{ name: "status", type: "text" }],
    },
    { name: "activePaymentProvider", type: "text" },
    { name: "activeShippingProvider", type: "text" },
  ],
};

const storeCredentialsCollection = createStoreCredentialsCollection({
  secretOrResolver: TEST_SECRET,
});

const { describe, it } = defineIntegrationSuite({
  collections: [storesCollection, storeCredentialsCollection],
});

const createTestStore = (payload: Payload, name: string, slug: string) =>
  payload.create({
    collection: "stores",
    data: {
      name,
      slug,
      subscription: { status: "trial" },
      theme: "default",
    },
  });

describe("storeCredentials Collection Integration", () => {
  it("persists non-secret fields and encrypts secrets on creation", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Alpha", "store-alpha");

    const savedDoc = await storeCredentialsFactory
      .transient({ payload })
      .create({
        paymentProvider: "midtrans",
        shippingProvider: "rajaongkir",
        store: store.id,
        midtrans: {
          clientKey: "SB-Mid-client-123",
          isProduction: false,
          serverKey: "SB-Mid-server-plaintext-secret",
        },
        rajaongkir: {
          accountType: "starter",
          apiKey: "ro-plaintext-api-key",
        },
        xendit: {
          isProduction: false,
          secretKey: "xnd_development_plaintext",
          webhookToken: "xnd_webhook_token_plaintext",
        },
      });

    const rawStore: unknown = savedDoc.store;
    let savedStoreId: unknown = rawStore;
    if (rawStore && typeof rawStore === "object" && "id" in rawStore) {
      savedStoreId = rawStore.id;
    }
    expect(savedStoreId).toBe(store.id);
    expect(savedDoc.paymentProvider).toBe("midtrans");
    expect(isCiphertext(savedDoc.midtrans?.serverKey)).toBeTruthy();
    expect(isCiphertext(savedDoc.xendit?.secretKey)).toBeTruthy();
    expect(isCiphertext(savedDoc.rajaongkir?.apiKey)).toBeTruthy();
  });

  it("decrypts stored ciphertext back to original plaintext", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Beta", "store-beta");

    const savedDoc = await storeCredentialsFactory
      .transient({ payload })
      .create({
        paymentProvider: "midtrans",
        shippingProvider: "rajaongkir",
        store: store.id,
        midtrans: {
          clientKey: "SB-Mid-client-123",
          isProduction: false,
          serverKey: "SB-Mid-server-plaintext-secret",
        },
        rajaongkir: {
          accountType: "starter",
          apiKey: "ro-plaintext-api-key",
        },
        xendit: {
          isProduction: false,
          secretKey: "xnd_development_plaintext",
          webhookToken: "xnd_webhook_token_plaintext",
        },
      });

    expect(
      decryptCredential(savedDoc.midtrans?.serverKey as string, TEST_SECRET)
    ).toBe("SB-Mid-server-plaintext-secret");
    expect(
      decryptCredential(savedDoc.xendit?.secretKey as string, TEST_SECRET)
    ).toBe("xnd_development_plaintext");
    expect(
      decryptCredential(savedDoc.xendit?.webhookToken as string, TEST_SECRET)
    ).toBe("xnd_webhook_token_plaintext");
    expect(
      decryptCredential(savedDoc.rajaongkir?.apiKey as string, TEST_SECRET)
    ).toBe("ro-plaintext-api-key");
  });

  it("preserves existing ciphertext during partial updates", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Gamma", "store-gamma");

    const created = await storeCredentialsFactory
      .transient({ payload })
      .create({
        paymentProvider: "midtrans",
        shippingProvider: "none",
        store: store.id,
        midtrans: {
          clientKey: "old-client-key",
          isProduction: false,
          serverKey: "existing-midtrans-secret",
        },
        xendit: {
          isProduction: false,
          secretKey: "existing-xendit-secret",
        },
      });

    const existingMidtransKey = created.midtrans?.serverKey;
    expect(isCiphertext(existingMidtransKey)).toBeTruthy();

    if (!created.id) {
      throw new Error("Created credential document is missing id");
    }

    // SAFETY: Payload Local API update returns persisted document matching StoreCredentials interface.
    const updated = (await payload.update({
      id: created.id,
      collection: "storeCredentials",
      data: {
        midtrans: {
          clientKey: "new-client-key-updated",
        },
      },
    })) as StoreCredentials;

    expect(updated.midtrans?.clientKey).toBe("new-client-key-updated");
    expect(updated.midtrans?.serverKey).toBe(existingMidtransKey);
    expect(
      decryptCredential(updated.midtrans?.serverKey as string, TEST_SECRET)
    ).toBe("existing-midtrans-secret");
  });

  it("preserves inactive provider credentials when toggling providers", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Delta", "store-delta");

    const created = await storeCredentialsFactory
      .transient({ payload })
      .create({
        paymentProvider: "midtrans",
        shippingProvider: "none",
        store: store.id,
        midtrans: {
          clientKey: "midtrans-client-key",
          isProduction: true,
          serverKey: "saved-midtrans-key",
        },
        xendit: {
          isProduction: false,
          secretKey: "saved-xendit-key",
        },
      });

    const originalMidtransKey = created.midtrans?.serverKey;
    const originalXenditKey = created.xendit?.secretKey;

    if (!created.id) {
      throw new Error("Created credential document is missing id");
    }

    // SAFETY: Payload Local API update returns persisted document matching StoreCredentials interface.
    const updated = (await payload.update({
      id: created.id,
      collection: "storeCredentials",
      data: {
        paymentProvider: "xendit",
      },
    })) as StoreCredentials;

    expect(updated.paymentProvider).toBe("xendit");
    expect(updated.midtrans?.serverKey).toBe(originalMidtransKey);
    expect(updated.midtrans?.clientKey).toBe("midtrans-client-key");
    expect(updated.xendit?.secretKey).toBe(originalXenditKey);
  });

  it("updating store metadata in a separate collection never mutates storeCredentials", async ({
    payload,
  }) => {
    const store = await createTestStore(
      payload,
      "Store Epsilon",
      "store-epsilon"
    );

    const created = await storeCredentialsFactory
      .transient({ payload })
      .create({
        paymentProvider: "midtrans",
        shippingProvider: "none",
        store: store.id,
        midtrans: {
          clientKey: "client-key",
          isProduction: false,
          serverKey: "secret-key",
        },
      });

    await payload.update({
      id: store.id,
      collection: "stores",
      data: {
        name: "New Store Display Name",
      },
    });

    if (!created.id) {
      throw new Error("Created credential document is missing id");
    }

    // SAFETY: Payload Local API findByID returns persisted document matching StoreCredentials interface.
    const fetched = (await payload.findByID({
      id: created.id,
      collection: "storeCredentials",
    })) as StoreCredentials;

    expect(fetched.midtrans?.serverKey).toBe(created.midtrans?.serverKey);
    expect(
      decryptCredential(fetched.midtrans?.serverKey as string, TEST_SECRET)
    ).toBe("secret-key");
  });
});
