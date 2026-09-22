import type { FieldAccess } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserTenantIDs } from "@/payload/lib/ids";
import type { Store } from "@/payload/payload-types";

/**
 * For use on the Stores collection itself — doc IS the store.
 */
export const canReadTenantRestrictedField: FieldAccess = ({ req, doc }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const tenantId = doc?.id as Store["id"] | undefined;

  if (!tenantId) {
    return false;
  }

  return getUserTenantIDs(req.user, "owner").includes(tenantId);
};

export const canReadRestrictedField = canReadTenantRestrictedField;
