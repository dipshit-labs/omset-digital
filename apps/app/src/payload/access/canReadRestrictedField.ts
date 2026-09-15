import type { FieldAccess } from "payload";
import { getUserTenantIDs } from "../lib/ids";
import type { Tenant } from "../payload-types";
import { isSuperAdmin } from "./isSuperAdmin";

const canReadRestrictedField: FieldAccess = ({ req, doc }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  const tenantRef = (doc?.tenant ?? doc?.id) as
    | Tenant
    | Tenant["id"]
    | undefined;
  const tenantId =
    typeof tenantRef === "object" && tenantRef !== null
      ? tenantRef.id
      : tenantRef;

  if (!tenantId) {
    return false;
  }

  return getUserTenantIDs(req.user, "owner").includes(tenantId);
};

export { canReadRestrictedField };
