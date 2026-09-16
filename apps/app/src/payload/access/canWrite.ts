import type { Access } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserTenantIDs } from "@/payload/lib/ids";

/**
 * Returns true / a tenant-scoped Where clause for write operations.
 * Tenant owners and managers can write; super-admin always can.
 */
const canWrite: Access = ({ req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const ids = [
    ...getUserTenantIDs(req.user, "owner"),
    ...getUserTenantIDs(req.user, "manager"),
  ];

  if (ids.length === 0) {
    return false;
  }

  return {
    tenant: { in: ids },
  };
};

export { canWrite };
