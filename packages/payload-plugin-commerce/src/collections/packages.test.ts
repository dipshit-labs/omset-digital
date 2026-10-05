import type {
  CheckboxField,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  Field,
  GroupField,
  RowField,
  SanitizedCollectionConfig,
  TextField,
  Where,
} from "payload";

import { describe, expect, it, vi } from "vitest";

import {
  createEnforceStoreOnCreate,
  createHandleDefaultPackageAfterChange,
  createHandleDefaultPackageBeforeChange,
  createPackagesCollection,
} from "./packages";

interface MockPackageRecord {
  id?: number;
  isDefault?: boolean;
  store?: number;
  title: string;
}

interface MockBeforeChangeArgs {
  collection?: SanitizedCollectionConfig;
  context?: Record<string, unknown>;
  data?: Partial<MockPackageRecord>;
  operation?: "create" | "update";
  originalDoc?: MockPackageRecord;
  req?: unknown;
}

interface MockAfterChangeArgs {
  collection?: SanitizedCollectionConfig;
  context?: Record<string, unknown>;
  data?: Partial<MockPackageRecord>;
  doc: MockPackageRecord;
  operation?: "create" | "update";
  previousDoc?: MockPackageRecord;
  req?: unknown;
}

const runBeforeChange = (
  hook: CollectionBeforeChangeHook,
  args: MockBeforeChangeArgs
): Promise<MockPackageRecord | undefined> => {
  // SAFETY: Invoking hook function with test mock arguments matching payload hook signature.
  const fn = hook as (
    input: MockBeforeChangeArgs
  ) => Promise<MockPackageRecord | undefined>;
  return fn(args);
};

const runAfterChange = (
  hook: CollectionAfterChangeHook,
  args: MockAfterChangeArgs
): Promise<MockPackageRecord | undefined> => {
  // SAFETY: Invoking hook function with test mock arguments matching payload hook signature.
  const fn = hook as (
    input: MockAfterChangeArgs
  ) => Promise<MockPackageRecord | undefined>;
  return fn(args);
};

describe("packages collection factory", () => {
  it("creates collection with default slug packages and useAsTitle title", () => {
    const collection = createPackagesCollection();

    expect(collection.slug).toBe("packages");
    expect(collection.admin?.useAsTitle).toBe("title");
  });

  it("defines title text field as required", () => {
    const collection = createPackagesCollection();
    const titleField = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "title"
    ) as TextField | undefined;

    expect(titleField).toBeDefined();
    expect(titleField?.type).toBe("text");
    expect(titleField?.required).toBeTruthy();
  });

  it("defines row field containing dimensions and tareWeight groups", () => {
    const collection = createPackagesCollection();
    const rowField = collection.fields.find(
      (f: Field): boolean => f.type === "row"
    ) as RowField | undefined;

    expect(rowField).toBeDefined();
    expect(rowField?.fields).toBeDefined();

    const dimensions = rowField?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "dimensions"
    ) as GroupField | undefined;
    expect(dimensions).toBeDefined();

    const tareWeight = rowField?.fields.find(
      (f: Field): boolean => "name" in f && f.name === "tareWeight"
    ) as GroupField | undefined;
    expect(tareWeight).toBeDefined();
  });

  it("defines isDefault checkbox field defaulting to false", () => {
    const collection = createPackagesCollection();
    const isDefault = collection.fields.find(
      (f: Field): boolean => "name" in f && f.name === "isDefault"
    ) as CheckboxField | undefined;

    expect(isDefault).toBeDefined();
    expect(isDefault?.type).toBe("checkbox");
    expect(isDefault?.defaultValue).toBeFalsy();
  });

  it("attaches beforeChange and afterChange hooks for store enforcement and default package management", () => {
    const collection = createPackagesCollection();

    expect(collection.hooks?.beforeChange).toHaveLength(2);
    expect(collection.hooks?.afterChange).toHaveLength(1);
  });

  it("supports custom slugs and merges custom overrides", () => {
    const collection = createPackagesCollection({
      slug: "custom-packages",
      storesSlug: "custom-stores",
      overrides: {
        admin: { useAsTitle: "customTitle" },
        hooks: {
          beforeChange: [vi.fn<() => void>()],
        },
      },
    });

    expect(collection.slug).toBe("custom-packages");
    expect(collection.admin?.useAsTitle).toBe("customTitle");
    expect(collection.hooks?.beforeChange).toHaveLength(3);
  });

  describe("access controls", () => {
    const collection = createPackagesCollection();

    it("create access requires authenticated user", () => {
      // SAFETY: Cast access control predicate to typed test invoker
      const createAccess = collection.access?.create as (args: {
        req: unknown;
      }) => boolean;
      expect(createAccess({ req: { user: { id: 1 } } })).toBeTruthy();
      expect(createAccess({ req: { user: null } })).toBeFalsy();
    });

    it("read access always returns true", () => {
      // SAFETY: Cast access control predicate to typed test invoker
      const readAccess = collection.access?.read as (args: {
        req: unknown;
      }) => boolean;
      expect(readAccess({ req: {} })).toBeTruthy();
    });

    it("delete access checks authentication, super-admin, and store tenant bounds", () => {
      // SAFETY: Cast access control predicate to typed test invoker
      const deleteAccess = collection.access?.delete as (args: {
        req: unknown;
      }) => unknown;
      expect(deleteAccess({ req: { user: null } })).toBeFalsy();
      expect(
        deleteAccess({ req: { user: { roles: ["super-admin"] } } })
      ).toBeTruthy();
      expect(
        deleteAccess({
          req: {
            user: {
              roles: ["editor"],
              stores: [{ id: 10 }, 20, null, undefined],
            },
          },
        })
      ).toStrictEqual({ store: { in: [10, 20] } });
      expect(
        deleteAccess({
          req: { user: { roles: ["editor"], stores: [] } },
        })
      ).toBeTruthy();
    });

    it("update access checks authentication, super-admin, and store tenant bounds", () => {
      // SAFETY: Cast access control predicate to typed test invoker
      const updateAccess = collection.access?.update as (args: {
        req: unknown;
      }) => unknown;
      expect(updateAccess({ req: { user: null } })).toBeFalsy();
      expect(
        updateAccess({ req: { user: { roles: ["super-admin"] } } })
      ).toBeTruthy();
      expect(
        updateAccess({
          req: {
            user: {
              roles: ["editor"],
              stores: [{ id: 5 }, 15],
            },
          },
        })
      ).toStrictEqual({ store: { in: [5, 15] } });
      expect(
        updateAccess({
          req: { user: { roles: ["editor"], stores: [] } },
        })
      ).toBeTruthy();
    });
  });
});

describe("enforceStoreOnCreate hook", () => {
  const hook = createEnforceStoreOnCreate();

  it("preserves data on update operation without checking store", async () => {
    const data: MockPackageRecord = { title: "Box A" };
    const result = await runBeforeChange(hook, {
      data,
      operation: "update",
      req: {},
    });

    expect(result).toStrictEqual(data);
  });

  it("preserves data on create operation when store is already present", async () => {
    const data: MockPackageRecord = { store: 101, title: "Box A" };
    const result = await runBeforeChange(hook, {
      data,
      operation: "create",
      req: {},
    });

    expect(result).toStrictEqual(data);
  });

  it("extracts store from cookie header when store is omitted", async () => {
    const data: MockPackageRecord = { title: "Box B" };
    const headers = new Headers();
    headers.set("cookie", "payload-tenant=42; other=val");

    const result = await runBeforeChange(hook, {
      data,
      operation: "create",
      req: { headers },
    });

    expect(result).toStrictEqual({ ...data, store: 42 });
  });

  it("extracts store from req.context when cookie is not present", async () => {
    const data: MockPackageRecord = { title: "Box C" };

    const result = await runBeforeChange(hook, {
      context: { storeId: 99 },
      data,
      operation: "create",
      req: { context: { storeId: 99 } },
    });

    expect(result).toStrictEqual({ ...data, store: 99 });
  });

  it("throws 400 APIError when no active store can be resolved on create", async () => {
    const data: MockPackageRecord = { title: "Box D" };

    await expect(
      runBeforeChange(hook, {
        data,
        operation: "create",
        req: {},
      })
    ).rejects.toThrow("No active store selected.");
  });

  it("bypasses store enforcement for super-admin user", async () => {
    const data: MockPackageRecord = { title: "Super Admin Box" };
    const result = await runBeforeChange(hook, {
      data,
      operation: "create",
      req: { user: { roles: ["super-admin"] } },
    });

    expect(result).toStrictEqual(data);
  });

  it("handles string tenant ID from plain object headers", async () => {
    const data: MockPackageRecord = { title: "Box String Tenant" };
    const result = await runBeforeChange(hook, {
      data,
      operation: "create",
      req: { headers: { cookie: "payload-tenant=store-alpha" } },
    });

    expect(result).toStrictEqual({ ...data, store: "store-alpha" });
  });

  it("handles headers without tenant cookie", async () => {
    const data: MockPackageRecord = { title: "Box No Cookie" };
    await expect(
      runBeforeChange(hook, {
        data,
        operation: "create",
        req: { headers: { cookie: "other=val" } },
      })
    ).rejects.toThrow("No active store selected.");
  });
});

describe("default package management hooks", () => {
  describe("beforeChange hook", () => {
    const beforeChange = createHandleDefaultPackageBeforeChange("packages");

    it("automatically marks the first package created for a store as isDefault = true", async () => {
      const countMock = vi
        .fn<
          (args: {
            collection: string;
            where: Where;
          }) => Promise<{ totalDocs: number }>
        >()
        .mockResolvedValue({ totalDocs: 0 });

      const req = { payload: { count: countMock } };
      const data: MockPackageRecord = {
        isDefault: false,
        store: 1,
        title: "Initial Box",
      };

      const result = await runBeforeChange(beforeChange, {
        data,
        operation: "create",
        req,
      });

      expect(countMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "packages",
          where: { store: { equals: 1 } },
        })
      );
      expect(result?.isDefault).toBeTruthy();
    });

    it("does not override isDefault = false if other packages already exist for the store", async () => {
      const countMock = vi
        .fn<
          (args: {
            collection: string;
            where: Where;
          }) => Promise<{ totalDocs: number }>
        >()
        .mockResolvedValue({ totalDocs: 2 });

      const req = { payload: { count: countMock } };
      const data: MockPackageRecord = {
        isDefault: false,
        store: 1,
        title: "Second Box",
      };

      const result = await runBeforeChange(beforeChange, {
        data,
        operation: "create",
        req,
      });

      expect(result?.isDefault).toBeFalsy();
    });

    it("prevents unsetting isDefault if this is the only default package for the store", async () => {
      const countMock = vi
        .fn<
          (args: {
            collection: string;
            where: Where;
          }) => Promise<{ totalDocs: number }>
        >()
        .mockResolvedValue({ totalDocs: 0 });

      const req = { payload: { count: countMock } };
      const data: MockPackageRecord = {
        isDefault: false,
        store: 1,
        title: "Only Default Box",
      };
      const originalDoc = {
        id: 10,
        isDefault: true,
        store: 1,
        title: "Only Default Box",
      };

      const result = await runBeforeChange(beforeChange, {
        data,
        operation: "update",
        originalDoc,
        req,
      });

      expect(result?.isDefault).toBeTruthy();
    });

    it("skips default package sync when skipDefaultPackageSync is set in context", async () => {
      const data: MockPackageRecord = {
        isDefault: false,
        store: 1,
        title: "Skip Box",
      };
      const result = await runBeforeChange(beforeChange, {
        data,
        operation: "create",
        req: { context: { skipDefaultPackageSync: true } },
      });

      expect(result).toStrictEqual(data);
    });

    it("returns data unchanged when store cannot be resolved", async () => {
      const data: MockPackageRecord = {
        isDefault: false,
        title: "No Store Box",
      };
      const result = await runBeforeChange(beforeChange, {
        data,
        operation: "create",
        req: {},
      });

      expect(result).toStrictEqual(data);
    });

    it("resolves storeId from populated store object and allows unsetting isDefault if another default exists", async () => {
      const countMock = vi
        .fn<() => Promise<{ totalDocs: number }>>()
        .mockResolvedValue({ totalDocs: 1 });
      const req = { payload: { count: countMock } };
      const data: MockPackageRecord = {
        isDefault: false,
        title: "Default Box",
      };
      const originalDoc = {
        id: 11,
        isDefault: true,
        // SAFETY: Test populated store object structure
        store: { id: 55 } as never,
        title: "Default Box",
      };

      const result = await runBeforeChange(beforeChange, {
        data,
        operation: "update",
        originalDoc,
        req,
      });

      expect(result?.isDefault).toBeFalsy();
    });
  });

  describe("afterChange hook", () => {
    const afterChange = createHandleDefaultPackageAfterChange("packages");

    it("unsets isDefault on other packages for the same store when doc is marked as default", async () => {
      const updateMock = vi
        .fn<
          (args: {
            collection: string;
            context: unknown;
            data: unknown;
            where: Where;
          }) => Promise<{ docs: unknown[] }>
        >()
        .mockResolvedValue({ docs: [] });

      const req = { payload: { update: updateMock } };
      const doc = { id: 25, isDefault: true, store: 5, title: "New Default" };

      await runAfterChange(afterChange, {
        data: {},
        doc,
        operation: "update",
        previousDoc: { ...doc, isDefault: false },
        req,
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: "packages",
          context: expect.objectContaining({ skipDefaultPackageSync: true }),
          data: { isDefault: false },
          where: {
            and: [
              { store: { equals: 5 } },
              { isDefault: { equals: true } },
              { id: { not_equals: 25 } },
            ],
          },
        })
      );
    });

    it("skips syncing when doc is not marked as default", async () => {
      const updateMock = vi.fn<() => Promise<{ docs: unknown[] }>>();
      const req = { payload: { update: updateMock } };
      const doc = { id: 26, isDefault: false, store: 5, title: "Non Default" };

      await runAfterChange(afterChange, {
        data: {},
        doc,
        operation: "update",
        previousDoc: doc,
        req,
      });

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("skips syncing when skipDefaultPackageSync is true in request context", async () => {
      const updateMock = vi.fn<() => Promise<{ docs: unknown[] }>>();
      const req = {
        context: { skipDefaultPackageSync: true },
        payload: { update: updateMock },
      };
      const doc = { id: 27, isDefault: true, store: 5, title: "Default" };

      await runAfterChange(afterChange, {
        data: {},
        doc,
        operation: "update",
        req,
      });

      expect(updateMock).not.toHaveBeenCalled();
    });

    it("handles doc with null or object store in afterChange", async () => {
      const updateMock = vi
        .fn<() => Promise<{ docs: unknown[] }>>()
        .mockResolvedValue({ docs: [] });
      const req = { payload: { update: updateMock } };

      await runAfterChange(afterChange, {
        data: {},
        operation: "update",
        req,
        doc: {
          id: 28,
          isDefault: true,
          store: undefined as never,
          title: "No Store",
        },
      });
      expect(updateMock).not.toHaveBeenCalled();

      await runAfterChange(afterChange, {
        data: {},
        operation: "update",
        req,
        // SAFETY: Test populated store object structure
        doc: {
          id: 29,
          isDefault: true,
          store: { id: 88 } as never,
          title: "Populated Store",
        },
      });
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            and: expect.arrayContaining([{ store: { equals: 88 } }]),
          }),
        })
      );
    });
  });
});
