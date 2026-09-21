import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { CollectionBeforeChangeHook, PayloadRequest } from "payload";
import { extractID, getCollectionIDType } from "@/payload/lib/ids";
import type { Tenant } from "@/payload/payload-types";

async function resolveDefaultPackageId(
  tenantRaw: unknown,
  req: PayloadRequest
): Promise<number | string | null> {
  let tenantId: number | string | null = tenantRaw
    ? extractID<Tenant>(tenantRaw as Tenant | Tenant["id"])
    : null;

  if (!tenantId && req?.headers) {
    tenantId = getTenantFromCookie(
      req.headers,
      getCollectionIDType({
        collectionSlug: "tenants",
        payload: req.payload,
      })
    );
  }

  if (!tenantId) {
    return null;
  }

  const defaultPkg = await req.payload.find({
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

  return defaultPkg.docs[0]?.id ?? null;
}

export const handleVariantShipping: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data.shipping) {
    return data;
  }

  const isRequired =
    data.shipping.required ?? originalDoc?.shipping?.required ?? true;

  if (!isRequired) {
    data.shipping.required = false;
    data.shipping.weight = {
      unit:
        data.shipping.weight?.unit ??
        originalDoc?.shipping?.weight?.unit ??
        "g",
      value: 0,
    };
    data.shipping.package = null;
    return data;
  }

  data.shipping.required = true;
  data.shipping.weight = {
    unit:
      data.shipping.weight?.unit ?? originalDoc?.shipping?.weight?.unit ?? "g",
    value:
      typeof data.shipping.weight?.value === "number"
        ? data.shipping.weight.value
        : (originalDoc?.shipping?.weight?.value ?? 0),
  };

  const existingPackage =
    data.shipping.package ?? originalDoc?.shipping?.package;

  if (!existingPackage) {
    const defaultPackageId = await resolveDefaultPackageId(
      data.tenant ?? originalDoc?.tenant,
      req
    );
    if (defaultPackageId) {
      data.shipping.package = defaultPackageId;
    }
  }
  return data;
};
