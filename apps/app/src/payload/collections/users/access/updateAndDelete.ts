import type { Access } from "payload";
import { isAccessingSelf } from "@/payload/access/isAccessingSelf";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserTenantIDs } from "@/payload/lib/ids";

const updateAndDeleteUserAccess: Access = ({ req, id }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user) || isAccessingSelf({ id, user: req.user })) {
    return true;
  }

  return {
    "tenants.tenant": {
      in: getUserTenantIDs(req.user, "owner"),
    },
  };
};

export { updateAndDeleteUserAccess };
