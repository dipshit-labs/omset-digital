import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
} from "payload";
import type { Theme } from "@/payload/payload-types";

export const handleLiveThemeBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (req.context?.skipLiveThemeSync) {
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
      collection: "themes",
      overrideAccess: true,
      req,
      where: {
        tenant: {
          equals: tenantId,
        },
      },
    });

    if (existing.totalDocs === 0) {
      data.isLive = true;
    }
  }

  if (operation === "update" && !data.isLive && originalDoc?.isLive) {
    const otherLive = await req.payload.count({
      collection: "themes",
      overrideAccess: true,
      req,
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { id: { not_equals: originalDoc.id } },
          { isLive: { equals: true } },
        ],
      },
    });

    if (otherLive.totalDocs === 0) {
      data.isLive = true;
    }
  }

  return data;
};

export const handleLiveThemeAfterChange: CollectionAfterChangeHook<
  Theme
> = async ({ doc, req }) => {
  if (req.context?.skipLiveThemeSync) {
    return doc;
  }

  if (!doc.isLive) {
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
    collection: "themes",
    overrideAccess: true,
    context: {
      ...req.context,
      skipLiveThemeSync: true,
    },
    data: {
      isLive: false,
    },
    req,
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { isLive: { equals: true } },
        { id: { not_equals: doc.id } },
      ],
    },
  });

  return doc;
};
