import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from "payload";
import type { Package } from "@/payload/payload-types";

export const handleDefaultPackageBeforeChange: CollectionBeforeChangeHook =
  async ({ data, operation, originalDoc, req }) => {
    if (req.context?.skipDefaultPackageSync) {
      return data;
    }

    const tenantRaw = data.tenant ?? originalDoc?.tenant;
    const tenantId =
      typeof tenantRaw === "object" && tenantRaw !== null
        ? tenantRaw.id
        : tenantRaw;

    if (!tenantId) {
      return data;
    }

    if (operation === "create") {
      const existing = await req.payload.count({
        collection: "packages",
        overrideAccess: true,
        req,
        where: {
          tenant: {
            equals: tenantId,
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
            { tenant: { equals: tenantId } },
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

  const tenantRaw = doc.tenant;
  const tenantId =
    typeof tenantRaw === "object" && tenantRaw !== null
      ? tenantRaw.id
      : tenantRaw;

  if (!tenantId) {
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
        { tenant: { equals: tenantId } },
        { isDefault: { equals: true } },
        { id: { not_equals: doc.id } },
      ],
    },
  });

  return doc;
};
