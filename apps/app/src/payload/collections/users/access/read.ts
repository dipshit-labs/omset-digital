import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { User } from "@repo/types";
import type { Access, Where } from "payload";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getCollectionIDType, getUserStoreIDs } from "@/payload/lib/ids";

import { isAccessingSelf } from "./isAccessingSelf";

const readUserAccess: Access<User> = ({ id, req }) => {
  if (!req.user) {
    return false;
  }

  if (isAccessingSelf({ id, user: req.user })) {
    return true;
  }

  const superAdmin = isSuperAdmin(req.user);
  const selectedStore = getTenantFromCookie(
    req.headers,
    getCollectionIDType({ collectionSlug: "stores", payload: req.payload })
  );
  const ownerStoreAccessIDs = getUserStoreIDs(req.user, "owner");

  if (selectedStore) {
    // If it's a super admin, or they have access to the store ID set in cookie
    const hasStoreAccess = ownerStoreAccessIDs.some(
      (ownerID) => ownerID === selectedStore
    );

    if (superAdmin || hasStoreAccess) {
      return {
        "stores.store": {
          equals: selectedStore,
        },
      };
    }
  }

  if (superAdmin) {
    return true;
  }

  // SAFETY: Filter object conforms to Payload Where clause query schema.
  return {
    or: [
      { id: { equals: req.user.id } },
      { "stores.store": { in: ownerStoreAccessIDs } },
    ],
  } as Where;
};

export { readUserAccess };
