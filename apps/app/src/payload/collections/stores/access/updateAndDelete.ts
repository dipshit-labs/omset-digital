import type { Access } from "payload";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

const updateAndDeleteStoreAccess: Access = ({ req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  return {
    id: {
      in: getUserStoreIDs(req.user, "owner"),
    },
  };
};

export { updateAndDeleteStoreAccess };
