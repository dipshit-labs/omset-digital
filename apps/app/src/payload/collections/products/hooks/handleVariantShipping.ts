import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { CollectionBeforeChangeHook } from "payload";
import { getCollectionIDType } from "@/payload/lib/ids";

export const handleVariantShipping: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const isPhysical =
    data.isPhysicalProduct ?? originalDoc?.isPhysicalProduct ?? true;

  if (!isPhysical) {
    data.isPhysicalProduct = false;
    data.weight = 0;
    data.package = null;
    return data;
  }

  data.isPhysicalProduct = true;
  data.weight = typeof data.weight === "number" ? data.weight : 0;

  if (!data.package) {
    const tenantRaw = data.tenant ?? originalDoc?.tenant;
    let tenantId =
      typeof tenantRaw === "object" && tenantRaw !== null
        ? tenantRaw.id
        : tenantRaw;

    if (!tenantId && req?.headers) {
      tenantId = getTenantFromCookie(
        req.headers,
        getCollectionIDType({
          collectionSlug: "tenants",
          payload: req.payload,
        })
      );
    }

    if (tenantId) {
      const defaultPkg = await req.payload.find({
        collection: "packages",
        depth: 0,
        limit: 1,
        overrideAccess: true,
        req,
        select: { isDefault: true },
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { isDefault: { equals: true } },
          ],
        },
      });

      if (defaultPkg.docs[0]) {
        data.package = defaultPkg.docs[0].id;
      }
    }
  }

  return data;
};
