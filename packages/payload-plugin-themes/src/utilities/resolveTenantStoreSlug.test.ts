import type { PayloadRequest } from "payload";

import { describe, expect, it } from "vitest";

import { resolveTenantStoreSlug } from "./resolveTenantStoreSlug";

const createStoreFinder =
  (targetId: number | string, slug: string) =>
  ({
    id,
  }: {
    id: number | string;
  }): Promise<{ id: number | string; slug: string } | null> =>
    Promise.resolve(id === targetId ? { id: targetId, slug } : null);

const createMockRequest = (mock: unknown): PayloadRequest =>
  // SAFETY: Duck-typed mock request fulfills PayloadRequest requirements for store resolution.
  mock as PayloadRequest;

describe(resolveTenantStoreSlug, () => {
  it("resolves store slug from data[tenantField] object", async () => {
    const slug = await resolveTenantStoreSlug({
      data: {
        store: {
          id: 1,
          slug: "store-alpha",
        },
      },
    });

    expect(slug).toBe("store-alpha");
  });

  it("resolves store slug using custom tenantField name", async () => {
    const slug = await resolveTenantStoreSlug({
      tenantField: "tenant",
      data: {
        tenant: {
          id: 2,
          slug: "custom-tenant",
        },
      },
    });

    expect(slug).toBe("custom-tenant");
  });

  it("resolves store from req.payload.findByID when data[tenantField] is an ID", async () => {
    const req = createMockRequest({
      payload: {
        findByID: createStoreFinder(10, "store-from-id"),
      },
    });

    const slug = await resolveTenantStoreSlug({
      req,
      data: {
        store: 10,
      },
    });

    expect(slug).toBe("store-from-id");
  });

  it("resolves store from req.payload.findByID when data[tenantField] is unpopulated object with id", async () => {
    const req = createMockRequest({
      payload: {
        findByID: createStoreFinder(10, "store-from-unpopulated"),
      },
    });

    const slug = await resolveTenantStoreSlug({
      req,
      data: {
        store: { id: 10 },
      },
    });

    expect(slug).toBe("store-from-unpopulated");
  });

  it("falls back to req.user.lastActiveStore when data has no store", async () => {
    const req = createMockRequest({
      user: {
        id: "user-1",
        lastActiveStore: {
          slug: "active-user-store",
        },
      },
    });

    const slug = await resolveTenantStoreSlug({
      data: {},
      req,
    });

    expect(slug).toBe("active-user-store");
  });

  it("falls back to req.user.lastActiveStore ID resolved via payload.findByID", async () => {
    const req = createMockRequest({
      payload: {
        findByID: createStoreFinder(55, "active-store-from-id"),
      },
      user: {
        id: "user-1",
        lastActiveStore: 55,
      },
    });

    const slug = await resolveTenantStoreSlug({
      data: null,
      req,
    });

    expect(slug).toBe("active-store-from-id");
  });

  it("returns null when no store context can be determined", async () => {
    const slug = await resolveTenantStoreSlug({
      data: null,
      req: null,
    });

    expect(slug).toBeNull();
  });
});
