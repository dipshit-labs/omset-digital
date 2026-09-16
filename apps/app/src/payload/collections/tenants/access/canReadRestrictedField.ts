import type { FieldAccess } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserTenantIDs } from "@/payload/lib/ids";
import type { Tenant } from "@/payload/payload-types";

/**
 * For use on the Tenants collection itself — doc IS the tenant.
 */
export const canReadTenantRestrictedField: FieldAccess = ({ req, doc }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const tenantId = doc?.id as Tenant["id"] | undefined;

  if (!tenantId) {
    return false;
  }

  return getUserTenantIDs(req.user, "owner").includes(tenantId);
};

/**
 * For use on tenant-scoped collections (Products, Orders, etc.) — doc.tenant is the ref.
 */
export const canReadScopedRestrictedField: FieldAccess = ({ req, doc }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const tenantRef = doc?.tenant as Tenant | Tenant["id"] | undefined;
  const tenantId =
    typeof tenantRef === "object" && tenantRef !== null
      ? tenantRef.id
      : tenantRef;

  if (!tenantId) {
    return false;
  }

  return getUserTenantIDs(req.user, "owner").includes(tenantId);
};

export const canReadRestrictedField = canReadTenantRestrictedField;
