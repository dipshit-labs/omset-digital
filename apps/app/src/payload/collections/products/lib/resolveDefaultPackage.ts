import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { Package, Store } from "@repo/types";
import type { PayloadRequest } from "payload";
import { extractID } from "payload/shared";

import { getCollectionIDType } from "@/payload/lib/ids";

export const resolveDefaultPackage = async (
  req: PayloadRequest,
  storeRaw?: unknown
): Promise<Package["id"] | null> => {
  // SAFETY: storeRaw if provided is a populated Store document or Store ID reference.
  let storeId: number | string | null = storeRaw
    ? extractID(storeRaw as Store | Store["id"])
    : null;

  if (!storeId && req?.headers) {
    storeId = getTenantFromCookie(
      req.headers,
      getCollectionIDType({ collectionSlug: "stores", payload: req.payload })
    );
  }

  if (!storeId) {
    return null;
  }

  const result = await req.payload.find({
    collection: "packages",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    select: { isDefault: true },
    where: {
      and: [{ store: { equals: storeId } }, { isDefault: { equals: true } }],
    },
  });

  return result.docs[0]?.id ?? null;
};
