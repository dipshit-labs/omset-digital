import type { Store } from "@repo/types";
import type { FieldAccess } from "payload";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

/**
 * For use on the Stores collection itself — doc IS the store.
 */
export const canReadStoreRestrictedField: FieldAccess = ({ doc, req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  // SAFETY: doc represents the Store collection document whose id is Store["id"].
  const storeId = doc?.id as Store["id"] | undefined;

  if (!storeId) {
    return false;
  }

  return getUserStoreIDs(req.user, "owner").includes(storeId);
};

/**
 * For use on store-scoped collections (Products, Orders, etc.) — doc.store is the ref.
 */
export const canReadScopedRestrictedField: FieldAccess = ({ doc, req }) => {
  if (!req.user) {
    return false;
  }

  if (isSuperAdmin(req.user)) {
    return true;
  }

  // SAFETY: doc represents a store-scoped document where store is a relationship reference.
  const storeRef = doc?.store as Store | Store["id"] | undefined;
  const storeId =
    typeof storeRef === "object" && storeRef !== null ? storeRef.id : storeRef;

  if (!storeId) {
    return false;
  }

  return getUserStoreIDs(req.user, "owner").includes(storeId);
};

export const canReadRestrictedField = canReadStoreRestrictedField;
