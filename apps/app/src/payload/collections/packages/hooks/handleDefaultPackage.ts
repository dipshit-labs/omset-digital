import type { Package, Store } from "@repo/types";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from "payload";
import { extractID } from "@/payload/lib/ids";

export const handleDefaultPackageBeforeChange: CollectionBeforeChangeHook =
  async ({ data, operation, originalDoc, req }) => {
    if (req.context?.skipDefaultPackageSync) {
      return data;
    }

    const storeRaw = data.store ?? originalDoc?.store;
    const storeId = storeRaw ? extractID<Store>(storeRaw) : null;

    if (!storeId) {
      return data;
    }

    if (operation === "create") {
      const existing = await req.payload.count({
        collection: "packages",
        overrideAccess: true,
        req,
        where: {
          store: {
            equals: storeId,
          },
        },
      });

      if (existing.totalDocs === 0) {
        data.isDefault = true;
      }
    }

    if (operation === "update" && !data.isDefault && originalDoc?.isDefault) {
      const otherDefaults = await req.payload.count({
        collection: "packages",
        overrideAccess: true,
        req,
        where: {
          and: [
            { store: { equals: storeId } },
            { id: { not_equals: originalDoc.id } },
            { isDefault: { equals: true } },
          ],
        },
      });

      if (otherDefaults.totalDocs === 0) {
        data.isDefault = true;
      }
    }

    return data;
  };

export const handleDefaultPackageAfterChange: CollectionAfterChangeHook<
  Package
> = async ({ doc, req }) => {
  if (req.context?.skipDefaultPackageSync) {
    return doc;
  }

  if (!doc.isDefault) {
    return doc;
  }

  const storeRaw = doc.store;
  const storeId = storeRaw ? extractID<Store>(storeRaw) : null;

  if (!storeId) {
    return doc;
  }

  await req.payload.update({
    collection: "packages",
    overrideAccess: true,
    context: {
      ...req.context,
      skipDefaultPackageSync: true,
    },
    data: {
      isDefault: false,
    },
    req,
    where: {
      and: [
        { store: { equals: storeId } },
        { isDefault: { equals: true } },
        { id: { not_equals: doc.id } },
      ],
    },
  });

  return doc;
};
