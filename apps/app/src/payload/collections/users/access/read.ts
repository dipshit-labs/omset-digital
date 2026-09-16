import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { Access, Where } from "payload";
import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getCollectionIDType, getUserTenantIDs } from "@/payload/lib/ids";
import type { User } from "@/payload/payload-types";
import { isAccessingSelf } from "./isAccessingSelf";

const readUserAccess: Access<User> = ({ req, id }) => {
  if (!req.user) {
    return false;
  }

  if (isAccessingSelf({ id, user: req.user })) {
    return true;
  }

  const superAdmin = isSuperAdmin(req.user);
  const selectedTenant = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: "tenants", payload: req.payload })
  );
  const ownerTenantAccessIDs = getUserTenantIDs(req.user, "owner");

  if (selectedTenant) {
    // If it's a super admin, or they have access to the tenant ID set in cookie
    const hasTenantAccess = ownerTenantAccessIDs.some(
      (ownerID) => ownerID === selectedTenant
    );

    if (superAdmin || hasTenantAccess) {
      return {
        "tenants.tenant": {
          equals: selectedTenant,
        },
      };
    }
  }

  if (superAdmin) {
    return true;
  }

  return {
    or: [
      { id: { equals: req.user.id } },
      { "tenants.tenant": { in: ownerTenantAccessIDs } },
    ],
  } as Where;
};

export { readUserAccess };
