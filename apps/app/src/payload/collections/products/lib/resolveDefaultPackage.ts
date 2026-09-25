import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { Package, Store } from "@repo/types";
import type { PayloadRequest } from "payload";
import { extractID, getCollectionIDType } from "@/payload/lib/ids";

export async function resolveDefaultPackage(
  req: PayloadRequest,
  storeRaw?: unknown
): Promise<Package["id"] | null> {
  let storeId: number | string | null = storeRaw
    ? extractID<Store>(storeRaw as Store | Store["id"])
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
}
