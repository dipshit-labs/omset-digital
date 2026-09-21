import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { PayloadRequest } from "payload";
import { extractID, getCollectionIDType } from "@/payload/lib/ids";
import type { Package, Tenant } from "@/payload/payload-types";

export async function resolveDefaultPackage(
  req: PayloadRequest,
  tenantRaw?: unknown
): Promise<Package["id"] | null> {
  let tenantId: number | string | null = tenantRaw
    ? extractID<Tenant>(tenantRaw as Tenant | Tenant["id"])
    : null;

  if (!tenantId && req?.headers) {
    tenantId = getTenantFromCookie(
      req.headers,
      getCollectionIDType({ collectionSlug: "tenants", payload: req.payload })
    );
  }

  if (!tenantId) {
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
      and: [{ tenant: { equals: tenantId } }, { isDefault: { equals: true } }],
    },
  });

  return result.docs[0]?.id ?? null;
}
