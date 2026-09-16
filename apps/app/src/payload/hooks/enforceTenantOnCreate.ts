import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { CollectionBeforeChangeHook } from "payload";
import { APIError } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getCollectionIDType } from "@/payload/lib/ids";

export const enforceTenantOnCreate: CollectionBeforeChangeHook = ({
  data,
  operation,
  req,
}) => {
  if (operation !== "create") {
    return data;
  }

  if (isSuperAdmin(req.user)) {
    return data;
  }

  const tenantId = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: "tenants", payload: req.payload })
  );

  if (!tenantId) {
    throw new APIError("No active tenant selected.", 400);
  }

  return { ...data, tenant: tenantId };
};
