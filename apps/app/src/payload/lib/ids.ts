import type { Store, User } from "@repo/types";
import type { CollectionSlug, Payload } from "payload";
import { extractID } from "payload/shared";

type UserStoreRole = NonNullable<User["stores"]>[number]["roles"][number];

export const getUserStoreIDs = (
  user: null | undefined | User,
  role?: UserStoreRole
): Store["id"][] => {
  if (!user?.stores) {
    return [];
  }

  const storeIDs: Store["id"][] = [];

  for (const item of user.stores) {
    if (!item?.store) {
      continue;
    }

    if (role && !item.roles?.includes(role)) {
      continue;
    }

    storeIDs.push(extractID(item.store));
  }

  return storeIDs;
};

interface GetCollectionIDTypeArgs {
  collectionSlug: CollectionSlug;
  payload: Payload;
}

export const getCollectionIDType = ({
  collectionSlug,
  payload,
}: GetCollectionIDTypeArgs): "number" | "text" =>
  payload.collections[collectionSlug]?.customIDType ?? payload.db.defaultIDType;
