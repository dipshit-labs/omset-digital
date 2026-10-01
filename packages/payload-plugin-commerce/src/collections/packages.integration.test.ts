import {
  createTestReq,
  describe,
  it,
  setTestPayloadConfig,
} from "@repo/test-kit";
import type { CollectionConfig, Payload } from "payload";
import { expect } from "vitest";

import { packageFactory } from "../../test/factories/packageFactory";
import { createPackagesCollection } from "./packages";

const storesCollection: CollectionConfig = {
  slug: "stores",
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
    },
    {
      name: "slug",
      required: true,
      type: "text",
    },
    {
      name: "theme",
      type: "text",
    },
    {
      name: "subscription",
      type: "group",
      fields: [
        {
          name: "status",
          type: "text",
        },
      ],
    },
  ],
};

const packagesCollection = createPackagesCollection();

setTestPayloadConfig({
  collections: [storesCollection, packagesCollection],
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

describe("packages collection integration", () => {
  it("assigns tenant store identifier when creating package with tenant header", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Alpha", "store-alpha");

    const headers = new Headers();
    headers.set("cookie", `payload-tenant=${store.id}`);
    headers.set("payload-tenant", String(store.id));
    const req = createTestReq({ headers });

    const pkg = await payload.create({
      collection: "packages",
      depth: 0,
      req,
      // SAFETY: store relationship is omitted from input data to test tenant header auto-assignment.
      data: {
        dimensions: { height: 10, length: 20, width: 15 },
        isDefault: false,
        tareWeight: { unit: "g", value: 100 },
        title: "Store Alpha - Box 1",
      } as never,
    });

    expect(pkg.store).toBe(store.id);

    const found = await payload.find({
      collection: "packages",
      where: {
        store: {
          equals: store.id,
        },
      },
    });

    expect(found.totalDocs).toBe(1);
    expect(found.docs[0]?.id).toBe(pkg.id);
  });

  it("promotes initial package for a store to default even when input specifies non-default", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Beta", "store-beta");

    const pkg = await packageFactory.transient({ payload }).create({
      isDefault: false,
      store: store.id,
      title: "Initial Box",
    });

    expect(pkg.isDefault).toBeTruthy();

    const found = await payload.find({
      collection: "packages",
      where: {
        and: [{ store: { equals: store.id } }, { isDefault: { equals: true } }],
      },
    });

    expect(found.totalDocs).toBe(1);
    expect(found.docs[0]?.id).toBe(pkg.id);
  });

  it("preserves non-default status on subsequent package when store already has a default package", async ({
    payload,
  }) => {
    const store = await createTestStore(payload, "Store Gamma", "store-gamma");

    const firstPkg = await packageFactory.transient({ payload }).create({
      isDefault: false,
      store: store.id,
      title: "First Box",
    });

    const secondPkg = await packageFactory.transient({ payload }).create({
      isDefault: false,
      store: store.id,
      title: "Second Box",
    });

    expect(firstPkg.isDefault).toBeTruthy();
    expect(secondPkg.isDefault).toBeFalsy();

    const found = await payload.find({
      collection: "packages",
      where: {
        store: {
          equals: store.id,
        },
      },
    });

    expect(found.totalDocs).toBe(2);

    const defaultPackages = await payload.find({
      collection: "packages",
      where: {
        and: [{ store: { equals: store.id } }, { isDefault: { equals: true } }],
      },
    });

    expect(defaultPackages.totalDocs).toBe(1);
    expect(defaultPackages.docs[0]?.id).toBe(firstPkg.id);
  });

  it("demotes prior default package when setting a new default package while leaving other stores unaffected", async ({
    payload,
  }) => {
    const storeA = await createTestStore(payload, "Store A", "store-a");
    const storeB = await createTestStore(payload, "Store B", "store-b");

    const storeAPkg1 = await packageFactory.transient({ payload }).create({
      isDefault: true,
      store: storeA.id,
      title: "Store A - Box 1",
    });
    const storeAPkg2 = await packageFactory.transient({ payload }).create({
      isDefault: false,
      store: storeA.id,
      title: "Store A - Box 2",
    });
    const storeBPkg1 = await packageFactory.transient({ payload }).create({
      isDefault: true,
      store: storeB.id,
      title: "Store B - Box 1",
    });

    expect([
      storeAPkg1.isDefault,
      storeAPkg2.isDefault,
      storeBPkg1.isDefault,
    ]).toStrictEqual([true, false, true]);

    await payload.update({
      collection: "packages",
      id: storeAPkg2.id,
      data: {
        isDefault: true,
      },
    });

    const refetchedAPkg1 = await payload.findByID({
      collection: "packages",
      id: storeAPkg1.id,
    });
    const refetchedAPkg2 = await payload.findByID({
      collection: "packages",
      id: storeAPkg2.id,
    });
    const refetchedBPkg1 = await payload.findByID({
      collection: "packages",
      id: storeBPkg1.id,
    });

    expect([
      refetchedAPkg1.isDefault,
      refetchedAPkg2.isDefault,
      refetchedBPkg1.isDefault,
    ]).toStrictEqual([false, true, true]);
  });
});
