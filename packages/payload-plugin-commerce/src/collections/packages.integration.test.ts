import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  SanitizedCollectionConfig,
  Where,
} from "payload";
import { describe, expect, it, vi } from "vitest";

import { createPackagesCollection } from "./packages";

interface MockPackageDoc {
  dimensions: {
    height: number;
    length: number;
    width: number;
  };
  id: number;
  isDefault: boolean;
  store: number;
  tareWeight: {
    unit: "g" | "kg";
    value: number;
  };
  title: string;
}

const mockCollectionConfig = {} as SanitizedCollectionConfig;

interface MockIntegrationBeforeChangeArgs {
  collection?: SanitizedCollectionConfig;
  context?: Record<string, unknown>;
  data?: unknown;
  operation?: "create" | "update";
  originalDoc?: unknown;
  req?: unknown;
}

interface MockIntegrationAfterChangeArgs {
  collection?: SanitizedCollectionConfig;
  context?: Record<string, unknown>;
  data?: unknown;
  doc: unknown;
  operation?: "create" | "update";
  previousDoc?: unknown;
  req?: unknown;
}

const runBeforeHook = (
  hook: CollectionBeforeChangeHook,
  args: MockIntegrationBeforeChangeArgs
): Promise<MockPackageDoc> => {
  // SAFETY: Invoking hook function with test mock arguments matching payload hook signature.
  const fn = hook as (
    input: MockIntegrationBeforeChangeArgs
  ) => Promise<MockPackageDoc>;
  return fn(args);
};

const runAfterHook = (
  hook: CollectionAfterChangeHook,
  args: MockIntegrationAfterChangeArgs
): Promise<MockPackageDoc> => {
  // SAFETY: Invoking hook function with test mock arguments matching payload hook signature.
  const fn = hook as (
    input: MockIntegrationAfterChangeArgs
  ) => Promise<MockPackageDoc>;
  return fn(args);
};

const isWhereField = (
  val: unknown
): val is { equals?: unknown; not_equals?: unknown } =>
  typeof val === "object" && val !== null && !Array.isArray(val);

describe("packages collection integration", () => {
  it("assigns store ID and marks first package as default while keeping subsequent packages non-default", async () => {
    const collection = createPackagesCollection();
    // SAFETY: Collection configuration hooks are typed CollectionBeforeChangeHook.
    const [enforceStore, handleDefault] = (collection.hooks?.beforeChange ??
      []) as [CollectionBeforeChangeHook, CollectionBeforeChangeHook];

    const packageDatabase: MockPackageDoc[] = [];

    const countFn = (where?: Where): number => {
      let docs = packageDatabase;
      const storeCond = where?.store;
      if (isWhereField(storeCond)) {
        docs = docs.filter((p) => p.store === storeCond.equals);
      }
      return docs.length;
    };

    const mockCount = vi
      .fn<({ where }: { where?: Where }) => Promise<{ totalDocs: number }>>()
      .mockImplementation(({ where }) =>
        Promise.resolve({ totalDocs: countFn(where) })
      );

    const headers = new Headers();
    headers.set("cookie", "payload-tenant=1");
    const mockReq = { headers, payload: { count: mockCount } };

    // 1. Create first package for Store 1 without explicit store -> gets store 1 and isDefault = true
    const input1 = {
      dimensions: { height: 10, length: 20, width: 15 },
      isDefault: false,
      tareWeight: { unit: "g" as const, value: 100 },
      title: "Store 1 - Box 1",
    };

    const afterEnforce1 = await runBeforeHook(enforceStore, {
      collection: mockCollectionConfig,
      context: {},
      data: input1,
      operation: "create",
      req: mockReq,
    });

    const final1 = await runBeforeHook(handleDefault, {
      collection: mockCollectionConfig,
      context: {},
      data: afterEnforce1,
      operation: "create",
      req: mockReq,
    });

    expect(final1.store).toBe(1);
    expect(final1.isDefault).toBeTruthy();

    const doc1: MockPackageDoc = { ...final1, id: 1 };
    packageDatabase.push(doc1);

    // 2. Create second package for Store 1 -> gets store 1 and isDefault = false
    const input2 = {
      dimensions: { height: 5, length: 10, width: 10 },
      isDefault: false,
      tareWeight: { unit: "g" as const, value: 50 },
      title: "Store 1 - Box 2",
    };

    const afterEnforce2 = await runBeforeHook(enforceStore, {
      collection: mockCollectionConfig,
      context: {},
      data: input2,
      operation: "create",
      req: mockReq,
    });

    const final2 = await runBeforeHook(handleDefault, {
      collection: mockCollectionConfig,
      context: {},
      data: afterEnforce2,
      operation: "create",
      req: mockReq,
    });

    expect(final2.store).toBe(1);
    expect(final2.isDefault).toBeFalsy();
  });

  it("deconflicts multiple packages ensuring single default package per store while maintaining tenant isolation", async () => {
    const collection = createPackagesCollection();
    // SAFETY: Collection configuration hooks are typed CollectionAfterChangeHook.
    const [afterChange] = (collection.hooks?.afterChange ?? []) as [
      CollectionAfterChangeHook,
    ];

    const packageDatabase: MockPackageDoc[] = [
      {
        dimensions: { height: 10, length: 20, width: 15 },
        id: 1,
        isDefault: true,
        store: 1,
        tareWeight: { unit: "g", value: 100 },
        title: "Store 1 - Box 1",
      },
      {
        dimensions: { height: 5, length: 10, width: 10 },
        id: 2,
        isDefault: false,
        store: 1,
        tareWeight: { unit: "g", value: 50 },
        title: "Store 1 - Box 2",
      },
      {
        dimensions: { height: 15, length: 30, width: 20 },
        id: 3,
        isDefault: true,
        store: 2,
        tareWeight: { unit: "kg", value: 0.5 },
        title: "Store 2 - Box 1",
      },
    ];

    const mockUpdate = vi
      .fn<
        (args: {
          data: Partial<MockPackageDoc>;
          where: Where;
        }) => Promise<{ docs: unknown[] }>
      >()
      .mockImplementation(({ data, where }) => {
        if (where?.and) {
          let matched = packageDatabase;
          for (const cond of where.and) {
            const storeCond = "store" in cond ? cond.store : undefined;
            if (isWhereField(storeCond)) {
              matched = matched.filter((p) => p.store === storeCond.equals);
            }
            const idCond = "id" in cond ? cond.id : undefined;
            if (isWhereField(idCond)) {
              matched = matched.filter((p) => p.id !== idCond.not_equals);
            }
          }
          for (const doc of matched) {
            Object.assign(doc, data);
          }
        }
        return Promise.resolve({ docs: [] });
      });

    const mockReq = { payload: { update: mockUpdate } };

    // Update Store 1 Box 2 to isDefault = true
    const [, targetDoc] = packageDatabase;
    if (!targetDoc) {
      throw new Error("Target document not found");
    }
    targetDoc.isDefault = true;
    const updatedDoc2: MockPackageDoc = {
      ...targetDoc,
    };
    await runAfterHook(afterChange, {
      collection: mockCollectionConfig,
      context: {},
      data: { isDefault: true },
      doc: updatedDoc2,
      operation: "update",
      previousDoc: targetDoc,
      req: mockReq,
    });

    // Verify Store 1 Box 2 became default, Box 1 was unset, and Store 2 was untouched
    const box1 = packageDatabase.find((p) => p.id === 1);
    const box2 = packageDatabase.find((p) => p.id === 2);
    const store2Box = packageDatabase.find((p) => p.id === 3);

    expect(box1?.isDefault).toBeFalsy();
    expect(box2?.isDefault).toBeTruthy();
    expect(store2Box?.isDefault).toBeTruthy();
  });
});
