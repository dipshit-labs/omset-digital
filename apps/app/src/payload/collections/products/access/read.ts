import type { Access, Where } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserTenantIDs } from "@/payload/lib/ids";

/**
 * Public reads return only published products.
 * Authenticated users also see all products from their own tenants (for admin).
 * Super-admin sees everything.
 */
const readProductAccess: Access = ({ req }): Where | boolean => {
  if (!req.user) {
    return { status: { equals: "published" } };
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const ids = [
    ...getUserTenantIDs(req.user, "owner"),
    ...getUserTenantIDs(req.user, "manager"),
  ];

  if (ids.length === 0) {
    return { status: { equals: "published" } };
  }

  return {
    or: [{ status: { equals: "published" } }, { tenant: { in: ids } }],
  };
};

export { readProductAccess };
