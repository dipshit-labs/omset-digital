import type { Package } from "@repo/types";
import type { PayloadRequest } from "payload";

import { resolveDocumentStoreId } from "../lifecycle/store";

export const resolveDefaultPackage = async (
  req: PayloadRequest,
  storeRaw?: unknown
): Promise<Package["id"] | null> => {
  const storeId = resolveDocumentStoreId({ store: storeRaw });
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
