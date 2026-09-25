import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { CollectionBeforeChangeHook } from "payload";
import { APIError } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getCollectionIDType } from "@/payload/lib/ids";

export const enforceStoreOnCreate: CollectionBeforeChangeHook = ({
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

  if (!req.user && data.store) {
    return data;
  }

  const storeId = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: "stores", payload: req.payload })
  );

  if (!storeId) {
    throw new APIError("No active store selected.", 400);
  }

  return { ...data, store: storeId };
};
