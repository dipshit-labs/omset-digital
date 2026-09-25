import type { Access } from "payload";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

import { isAccessingSelf } from "./isAccessingSelf";

/**
 * Access control for updating and deleting user records.
 *
 * Super-admins can update/delete any user; users can update/delete their own record.
 * For cross-user actions within a store, only store owners (not managers) have
 * permission to update or delete other users. This intentional asymmetry matches
 * `createUserAccess`, which also restricts user management to the owner role.
 */
const updateAndDeleteUserAccess: Access = ({ id, req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user) || isAccessingSelf({ id, user: req.user })) {
    return true;
  }

  return {
    "stores.store": {
      in: getUserStoreIDs(req.user, "owner"),
    },
  };
};

export { updateAndDeleteUserAccess };
