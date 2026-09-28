import type { Access, Where } from "payload";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

/**
 * Public reads return only published pages.
 * Authenticated users also see all pages from their own stores (for admin).
 * Super-admin sees everything.
 */
const readPageAccess: Access = ({ req }): Where | boolean => {
  if (!req.user) {
    return { _status: { equals: "published" } };
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const ids = [
    ...getUserStoreIDs(req.user, "owner"),
    ...getUserStoreIDs(req.user, "manager"),
  ];

  if (ids.length === 0) {
    return { _status: { equals: "published" } };
  }

  return {
    or: [{ _status: { equals: "published" } }, { store: { in: ids } }],
  };
};

export { readPageAccess };
