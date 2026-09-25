import type { Access } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

/**
 * Returns true / a store-scoped Where clause for write operations.
 * Store owners and managers can write; super-admin always can.
 */
const canWrite: Access = ({ req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const ids = [
    ...getUserStoreIDs(req.user, "owner"),
    ...getUserStoreIDs(req.user, "manager"),
  ];

  if (ids.length === 0) {
    return false;
  }

  return {
    store: { in: ids },
  };
};

export { canWrite };
