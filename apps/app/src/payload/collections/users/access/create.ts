import type { Store, User } from "@repo/types";
import type { Access } from "payload";

import { isSuperAdmin } from "@/payload/access/isSuperAdmin";
import { getUserStoreIDs } from "@/payload/lib/ids";

type UserStoreEntry = NonNullable<User["stores"]>[number];

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

  const adminStoreAccessIDs = getUserStoreIDs(req.user, "owner");

  // SAFETY: req.data reflects incoming User document data where stores contains store assignments.
  const rawStores = req.data?.stores as UserStoreEntry[] | undefined;
  const requestedStores: Store["id"][] =
    rawStores?.map((s: UserStoreEntry) =>
      typeof s.store === "object" ? s.store.id : s.store
    ) ?? [];

  const hasAccessToAllRequestedStores = requestedStores.every((storeID) =>
    adminStoreAccessIDs.includes(storeID)
  );

  if (hasAccessToAllRequestedStores) {
    return true;
  }

  return false;
};

export { createUserAccess };
