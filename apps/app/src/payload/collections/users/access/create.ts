import type { Access } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserTenantIDs } from "@/payload/lib/ids";
import type { Store, User } from "@/payload/payload-types";

const createUserAccess: Access<User> = ({ req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  if (req.data?.roles?.includes("super-admin")) {
    return false;
  }

  const adminTenantAccessIDs = getUserTenantIDs(req.user, "owner");

  const requestedTenants: Store["id"][] =
    req.data?.tenants?.map((t: { tenant: Store["id"] }) => t.tenant) ?? [];

  const hasAccessToAllRequestedTenants = requestedTenants.every((tenantID) =>
    adminTenantAccessIDs.includes(tenantID)
  );

  if (hasAccessToAllRequestedTenants) {
    return true;
  }

  return false;
};

export { createUserAccess };
