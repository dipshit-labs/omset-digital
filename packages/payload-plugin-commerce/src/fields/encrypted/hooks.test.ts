import type { FieldHookArgs, PayloadRequest } from "payload";

import { describe, expect, it } from "vitest";

import {
  decryptCredential,
  encryptCredential,
  isCiphertext,
} from "@repo/commerce-adapters/utils";
import { createEncryptedFieldBeforeChange } from "./hooks";

const TEST_SECRET = "test-secret-that-is-at-least-32-chars-long";

const createMockReq = (secret = TEST_SECRET): PayloadRequest => {
  const req = {
    payload: {
      secret,
    },
  };
  // SAFETY: Test mock satisfies PayloadRequest interface needed by encryption hooks.
  return req as PayloadRequest;
};

const createHookArgs = (
  overrides: Partial<FieldHookArgs> & { value: unknown }
): FieldHookArgs => {
  const args = {
    blockData: undefined,
    collection: null,
    context: {},
    data: {},
    field: { name: "serverKey", type: "text" },
    global: null,
    indexPath: [],
    operation: "create",
    originalDoc: undefined,
    path: ["serverKey"],
    previousDoc: undefined,
    previousSiblingDoc: undefined,
    previousValue: undefined,
    req: createMockReq(),
    schemaPath: ["serverKey"],
    siblingData: {},
    siblingFields: [],
    ...overrides,
  };
  // SAFETY: Test mock satisfies FieldHookArgs contract for unit testing.
  return args as FieldHookArgs;
};

describe(createEncryptedFieldBeforeChange, () => {
  it("encrypts plaintext string into versioned ciphertext", async () => {
    const hook = createEncryptedFieldBeforeChange();

    const result = await hook(
      createHookArgs({
        value: "SB-Mid-server-plaintext-12345",
      })
    );

    expect(isCiphertext(result)).toBeTruthy();
    expect(decryptCredential(result as string, TEST_SECRET)).toBe(
      "SB-Mid-server-plaintext-12345"
    );
  });

  it("does not re-encrypt already-encrypted ciphertext", async () => {
    const hook = createEncryptedFieldBeforeChange();
    const existingCiphertext = encryptCredential("my-secret-key", TEST_SECRET);

    const result = await hook(
      createHookArgs({
        operation: "update",
        value: existingCiphertext,
      })
    );

    expect(result).toBe(existingCiphertext);
  });

  it("falls back to originalDoc value when incoming value is undefined", async () => {
    const hook = createEncryptedFieldBeforeChange();
    const storedCiphertext = encryptCredential(
      "original-secret-key",
      TEST_SECRET
    );

    const result = await hook(
      createHookArgs({
        operation: "update",
        path: ["midtrans", "serverKey"],
        value: undefined,
        originalDoc: {
          midtrans: {
            serverKey: storedCiphertext,
          },
        },
      })
    );

    expect(result).toBe(storedCiphertext);
  });

  it("falls back to originalDoc value when incoming value is an empty string", async () => {
    const hook = createEncryptedFieldBeforeChange();
    const storedCiphertext = encryptCredential(
      "original-secret-key",
      TEST_SECRET
    );

    const result = await hook(
      createHookArgs({
        operation: "update",
        path: ["midtrans", "serverKey"],
        value: "",
        originalDoc: {
          midtrans: {
            serverKey: storedCiphertext,
          },
        },
      })
    );

    expect(result).toBe(storedCiphertext);
  });

  it("returns undefined when value is empty and no originalDoc exists", async () => {
    const hook = createEncryptedFieldBeforeChange();

    const result = await hook(
      createHookArgs({
        value: undefined,
      })
    );

    expect(result).toBeUndefined();
  });

  it("allows passing custom secret resolver or fixed secret", async () => {
    const customSecret = "custom-secret-key-that-is-32-chars-long!";
    const hook = createEncryptedFieldBeforeChange(customSecret);

    const result = await hook(
      createHookArgs({
        field: { name: "apiKey", type: "text" },
        req: createMockReq("unused-req-secret"),
        value: "rajaongkir-api-key-123",
      })
    );

    expect(isCiphertext(result)).toBeTruthy();
    expect(decryptCredential(result as string, customSecret)).toBe(
      "rajaongkir-api-key-123"
    );
  });

  it("handles string path, resolver function, and missing secret error", async () => {
    // 1. Function resolver
    const hookWithFn = createEncryptedFieldBeforeChange(() => TEST_SECRET);
    const resFn = await hookWithFn(
      createHookArgs({
        field: { name: "apiKey", type: "text" },
        req: {} as never,
        value: "value-with-fn",
      })
    );
    expect(isCiphertext(resFn)).toBeTruthy();

    // 2. String path dot notation
    const hook = createEncryptedFieldBeforeChange(TEST_SECRET);
    const resStringPath = await hook(
      createHookArgs({
        field: { name: "serverKey", type: "text" },
        originalDoc: { midtrans: { serverKey: "existing-ciphertext" } },
        // SAFETY: FieldHook path parameter accepts string at runtime for dot-notation lookup.
        path: "midtrans.serverKey" as never,
        value: "",
      })
    );
    expect(resStringPath).toBe("existing-ciphertext");

    // 3. Missing secret error
    const hookNoSecret = createEncryptedFieldBeforeChange();
    expect(() =>
      hookNoSecret(
        createHookArgs({
          field: { name: "key", type: "text" },
          req: { payload: {} } as never,
          value: "secret-data",
        })
      )
    ).toThrow("Encryption secret not found");
  });
});
