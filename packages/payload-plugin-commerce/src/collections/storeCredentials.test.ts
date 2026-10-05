import type {
  Field,
  GroupField,
  RelationshipField,
  SelectField,
  TextField,
} from "payload";

import { describe, expect, it, vi } from "vitest";

import { createStoreCredentialsCollection } from "./storeCredentials";

describe("storeCredentials collection factory", () => {
  it("creates collection hidden from admin navigation with slug storeCredentials", () => {
    const collection = createStoreCredentialsCollection();

    expect(collection.slug).toBe("storeCredentials");
    expect(collection.admin?.hidden).toBeTruthy();
  });

  it("defines a unique 1:1 relationship field pointing to stores", () => {
    const collection = createStoreCredentialsCollection();
    const storeField = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "store"
    ) as RelationshipField | undefined;

    expect(storeField).toBeDefined();
    expect(storeField?.type).toBe("relationship");
    expect(storeField?.relationTo).toBe("stores");
    expect(storeField?.unique).toBeTruthy();
    expect(storeField?.required).toBeTruthy();
  });

  it("defines paymentProvider select field with default 'none'", () => {
    const collection = createStoreCredentialsCollection();
    const paymentProvider = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "paymentProvider"
    ) as SelectField | undefined;

    expect(paymentProvider).toBeDefined();
    expect(paymentProvider?.defaultValue).toBe("none");
    expect(paymentProvider?.options).toStrictEqual([
      { label: "None", value: "none" },
      { label: "Midtrans", value: "midtrans" },
      { label: "Xendit", value: "xendit" },
    ]);
  });

  it("defines shippingProvider select field with default 'none'", () => {
    const collection = createStoreCredentialsCollection();
    const shippingProvider = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "shippingProvider"
    ) as SelectField | undefined;

    expect(shippingProvider).toBeDefined();
    expect(shippingProvider?.defaultValue).toBe("none");
    expect(shippingProvider?.options).toStrictEqual([
      { label: "None", value: "none" },
      { label: "RajaOngkir", value: "rajaongkir" },
    ]);
  });

  it("defines namespaced group for midtrans with encrypted secret key", () => {
    const collection = createStoreCredentialsCollection();
    const midtransGroup = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "midtrans"
    ) as GroupField | undefined;

    expect(midtransGroup).toBeDefined();

    const serverKeyField = midtransGroup?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "serverKey"
    ) as TextField | undefined;
    const clientKeyField = midtransGroup?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "clientKey"
    ) as TextField | undefined;

    expect(serverKeyField?.hooks?.beforeChange).toHaveLength(1);
    expect(clientKeyField).toBeDefined();
  });

  it("defines namespaced group for xendit with encrypted secrets", () => {
    const collection = createStoreCredentialsCollection();
    const xenditGroup = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "xendit"
    ) as GroupField | undefined;

    expect(xenditGroup).toBeDefined();

    const xenditSecret = xenditGroup?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "secretKey"
    ) as TextField | undefined;
    const webhookToken = xenditGroup?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "webhookToken"
    ) as TextField | undefined;

    expect(xenditSecret?.hooks?.beforeChange).toHaveLength(1);
    expect(webhookToken?.hooks?.beforeChange).toHaveLength(1);
  });

  it("defines namespaced group for rajaongkir with encrypted api key", () => {
    const collection = createStoreCredentialsCollection();
    const rajaongkirGroup = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "rajaongkir"
    ) as GroupField | undefined;

    expect(rajaongkirGroup).toBeDefined();

    const apiKeyField = rajaongkirGroup?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "apiKey"
    ) as TextField | undefined;

    expect(apiKeyField?.hooks?.beforeChange).toHaveLength(1);
  });

  describe("access controls", () => {
    const collection = createStoreCredentialsCollection();
    type AccessFn = (args: { req: { user: unknown } }) => boolean;

    it("requires authenticated user for create and read", () => {
      const { create, read } = collection.access ?? {};
      const authed = { req: { user: { id: 1 } } };
      const anon = { req: { user: null } };

      // SAFETY: Cast access control predicate to typed test invoker
      const createFn = create as AccessFn;
      const readFn = read as AccessFn;

      expect(createFn(authed)).toBeTruthy();
      expect(createFn(anon)).toBeFalsy();
      expect(readFn(authed)).toBeTruthy();
      expect(readFn(anon)).toBeFalsy();
    });

    it("requires authenticated user for delete and update", () => {
      const { delete: del, update } = collection.access ?? {};
      const authed = { req: { user: { id: 1 } } };
      const anon = { req: { user: null } };

      // SAFETY: Cast access control predicate to typed test invoker
      const deleteFn = del as AccessFn;
      const updateFn = update as AccessFn;

      expect(deleteFn(authed)).toBeTruthy();
      expect(deleteFn(anon)).toBeFalsy();
      expect(updateFn(authed)).toBeTruthy();
      expect(updateFn(anon)).toBeFalsy();
    });
  });

  describe("afterChange syncActiveProvidersToStore hook", () => {
    const collection = createStoreCredentialsCollection();
    const [afterChangeHook] = collection.hooks?.afterChange ?? [];
    // SAFETY: Cast collection afterChange hook to test runner
    const runHook = afterChangeHook as (args: unknown) => Promise<unknown>;

    it("syncs active providers to store document and handles skipSync", async () => {
      const updateMock = vi.fn<() => Promise<unknown>>().mockResolvedValue({});
      const req = { payload: { update: updateMock } };

      // 1. Successful sync
      await runHook({
        context: {},
        req,
        doc: {
          paymentProvider: "midtrans",
          shippingProvider: "rajaongkir",
          store: 42,
        },
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 42,
          collection: "stores",
          context: { skipSync: true },
          data: {
            activePaymentProvider: "midtrans",
            activeShippingProvider: "rajaongkir",
          },
        })
      );

      // 2. Skip when context.skipSync is true
      updateMock.mockClear();
      await runHook({
        context: { skipSync: true },
        doc: { store: 42 },
        req,
      });
      expect(updateMock).not.toHaveBeenCalled();

      // 3. Skip when store is missing or empty object
      await runHook({
        context: {},
        doc: { store: null },
        req,
      });
      await runHook({
        context: {},
        doc: { store: {} },
        req,
      });
      expect(updateMock).not.toHaveBeenCalled();

      // 4. Catches update errors without throwing
      updateMock.mockRejectedValueOnce(new Error("Update failed"));
      await expect(
        runHook({
          context: {},
          doc: { store: 42 },
          req,
        })
      ).resolves.toBeDefined();
    });
  });
});
