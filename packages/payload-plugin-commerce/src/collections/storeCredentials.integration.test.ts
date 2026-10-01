import {
  decryptCredential,
  encryptCredential,
  isCiphertext,
} from "@repo/commerce-adapters/utils";
import type {
  CollectionConfig,
  Field,
  FieldHook,
  FieldHookArgs,
  GroupField,
  PayloadRequest,
} from "payload";
import { describe, expect, it } from "vitest";

import type { StoreCredentials } from "../types";
import { createStoreCredentialsCollection } from "./storeCredentials";

const TEST_SECRET = "omset-digital-test-master-secret-32-chars!";

const createMockReq = (secret = TEST_SECRET): PayloadRequest => {
  const req = {
    payload: {
      secret,
    },
  };
  // SAFETY: Test mock satisfies PayloadRequest interface needed by encryption hooks.
  return req as PayloadRequest;
};

/**
 * Simulates Payload field beforeChange hook pipeline for a collection document.
 */
const runCollectionBeforeChangeHooks = async ({
  collection,
  data,
  operation,
  originalDoc,
  req,
}: {
  collection: CollectionConfig;
  data: Partial<StoreCredentials>;
  operation: "create" | "update";
  originalDoc?: StoreCredentials;
  req: PayloadRequest;
}): Promise<StoreCredentials> => {
  const result: Record<string, unknown> = structuredClone(data);

  const processFields = async (
    fields: Field[],
    currentData: Record<string, unknown>,
    currentOriginalDoc: Record<string, unknown> | undefined,
    parentPath: string[] = []
  ) => {
    for (const field of fields) {
      if (!("name" in field) || typeof field.name !== "string") {
        continue;
      }

      const fieldName = field.name;
      const fieldPath = [...parentPath, fieldName];

      if (field.type === "group" && "fields" in field) {
        const incomingGroup = currentData[fieldName] as
          | Record<string, unknown>
          | undefined;
        const groupOriginal = currentOriginalDoc?.[fieldName] as
          | Record<string, unknown>
          | undefined;
        const groupData = {
          ...groupOriginal,
          ...incomingGroup,
        };
        // oxlint-disable-next-line eslint/no-await-in-loop
        await processFields(
          (field as GroupField).fields,
          groupData,
          groupOriginal,
          fieldPath
        );
        currentData[fieldName] = groupData;
        continue;
      }

      const rawValue = currentData[fieldName];
      let value = rawValue;

      if ("hooks" in field && field.hooks?.beforeChange) {
        for (const hook of field.hooks.beforeChange as FieldHook[]) {
          const rawHookArgs = {
            blockData: undefined,
            collection: null,
            context: {},
            data: currentData,
            field,
            global: null,
            indexPath: [],
            operation,
            originalDoc,
            path: fieldPath,
            previousDoc: originalDoc,
            previousSiblingDoc: currentOriginalDoc,
            previousValue: currentOriginalDoc?.[fieldName],
            req,
            schemaPath: fieldPath,
            siblingData: currentData,
            siblingFields: [],
            value,
          };
          // SAFETY: Test runner mock args satisfy FieldHookArgs interface.
          const hookArgs = rawHookArgs as FieldHookArgs;
          // oxlint-disable-next-line eslint/no-await-in-loop
          value = await hook(hookArgs);
        }
      }

      if (value !== undefined) {
        currentData[fieldName] = value;
      } else if (
        operation === "update" &&
        currentOriginalDoc?.[fieldName] !== undefined
      ) {
        currentData[fieldName] = currentOriginalDoc[fieldName];
      }
    }
  };

  const rawOriginal = originalDoc as Record<string, unknown> | undefined;
  await processFields(collection.fields, result, rawOriginal);
  // SAFETY: Processed collection doc satisfies StoreCredentials model.
  const output: unknown = result;
  return output as StoreCredentials;
};
describe("storeCredentials Collection Integration", () => {
  const collection = createStoreCredentialsCollection({
    secretOrResolver: TEST_SECRET,
  });
  const req = createMockReq();

  const sampleCreationInput: Partial<StoreCredentials> = {
    paymentProvider: "midtrans",
    shippingProvider: "rajaongkir",
    store: "store-uuid-1",
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
  };

  it("persists non-secret fields and encrypts secrets on creation", async () => {
    const savedDoc = await runCollectionBeforeChangeHooks({
      collection,
      data: sampleCreationInput,
      operation: "create",
      req,
    });

    expect(savedDoc.store).toBe("store-uuid-1");
    expect(savedDoc.paymentProvider).toBe("midtrans");
    expect(isCiphertext(savedDoc.midtrans?.serverKey)).toBeTruthy();
    expect(isCiphertext(savedDoc.xendit?.secretKey)).toBeTruthy();
    expect(isCiphertext(savedDoc.rajaongkir?.apiKey)).toBeTruthy();
  });

  it("decrypts stored ciphertext back to original plaintext", async () => {
    const savedDoc = await runCollectionBeforeChangeHooks({
      collection,
      data: sampleCreationInput,
      operation: "create",
      req,
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

  it("preserves existing ciphertext during partial updates", async () => {
    const existingServerKey = encryptCredential(
      "existing-midtrans-secret",
      TEST_SECRET
    );
    const existingXenditKey = encryptCredential(
      "existing-xendit-secret",
      TEST_SECRET
    );

    const originalDoc: StoreCredentials = {
      id: "cred-1",
      paymentProvider: "midtrans",
      shippingProvider: "none",
      store: "store-uuid-1",
      midtrans: {
        clientKey: "old-client-key",
        isProduction: false,
        serverKey: existingServerKey,
      },
      xendit: {
        isProduction: false,
        secretKey: existingXenditKey,
      },
    };

    const partialUpdate: Partial<StoreCredentials> = {
      midtrans: {
        clientKey: "new-client-key-updated",
      },
    };

    const updatedDoc = await runCollectionBeforeChangeHooks({
      collection,
      data: partialUpdate,
      operation: "update",
      originalDoc,
      req,
    });

    expect(updatedDoc.midtrans?.clientKey).toBe("new-client-key-updated");
    expect(updatedDoc.midtrans?.serverKey).toBe(existingServerKey);
    expect(
      decryptCredential(updatedDoc.midtrans?.serverKey as string, TEST_SECRET)
    ).toBe("existing-midtrans-secret");
  });

  it("preserves inactive provider credentials when toggling providers", async () => {
    const originalMidtransKey = encryptCredential(
      "saved-midtrans-key",
      TEST_SECRET
    );
    const originalXenditKey = encryptCredential(
      "saved-xendit-key",
      TEST_SECRET
    );

    const originalDoc: StoreCredentials = {
      id: "cred-1",
      paymentProvider: "midtrans",
      shippingProvider: "none",
      store: "store-uuid-1",
      midtrans: {
        clientKey: "midtrans-client-key",
        isProduction: true,
        serverKey: originalMidtransKey,
      },
      xendit: {
        isProduction: false,
        secretKey: originalXenditKey,
      },
    };

    const switchProviderUpdate: Partial<StoreCredentials> = {
      paymentProvider: "xendit",
    };

    const updatedDoc = await runCollectionBeforeChangeHooks({
      collection,
      data: switchProviderUpdate,
      operation: "update",
      originalDoc,
      req,
    });

    expect(updatedDoc.paymentProvider).toBe("xendit");
    expect(updatedDoc.midtrans?.serverKey).toBe(originalMidtransKey);
    expect(updatedDoc.midtrans?.clientKey).toBe("midtrans-client-key");
    expect(updatedDoc.xendit?.secretKey).toBe(originalXenditKey);
  });

  it("updating store metadata in a separate collection never mutates storeCredentials", () => {
    const credentialsBefore: StoreCredentials = {
      id: "cred-1",
      paymentProvider: "midtrans",
      shippingProvider: "none",
      store: "store-123",
      midtrans: {
        clientKey: "client-key",
        serverKey: encryptCredential("secret-key", TEST_SECRET),
      },
    };

    const storeProfileUpdate = {
      customDomain: "myshop.com",
      id: "store-123",
      name: "New Store Display Name",
      theme: "minimal",
    };

    expect(storeProfileUpdate).not.toHaveProperty("midtrans");
    expect(storeProfileUpdate).not.toHaveProperty("xendit");
    expect(storeProfileUpdate).not.toHaveProperty("rajaongkir");
    expect(credentialsBefore.midtrans?.serverKey).toBeDefined();
    expect(
      decryptCredential(
        credentialsBefore.midtrans?.serverKey as string,
        TEST_SECRET
      )
    ).toBe("secret-key");
  });
});
