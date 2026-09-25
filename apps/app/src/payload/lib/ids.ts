import type { Config, Store, User } from "@repo/types";
import type { CollectionSlug, Payload } from "payload";

export const extractID = <T extends Config["collections"][CollectionSlug]>(
  objectOrID: T | T["id"]
): T["id"] => {
  if (
    typeof objectOrID === "object" &&
    objectOrID !== null &&
    "id" in objectOrID
  ) {
    return objectOrID.id;
  }

  return objectOrID;
};

export const getUserStoreIDs = (
  user: null | undefined | User,
  role?: NonNullable<User["stores"]>[number]["roles"][number]
): Store["id"][] => {
  if (!(user && Array.isArray(user.stores))) {
    return [];
  }

  return user.stores.reduce<Store["id"][]>((acc, item) => {
    if (!item?.store) {
      return acc;
    }

    const userRoles = item.roles ?? [];

    if (role && !userRoles.includes(role)) {
      return acc;
    }

    acc.push(extractID<Store>(item.store));
    return acc;
  }, []);
};

interface GetCollectionIDTypeParams {
  collectionSlug: CollectionSlug;
  payload: Payload;
}

export const getCollectionIDType = ({
  collectionSlug,
  payload,
}: GetCollectionIDTypeParams): "number" | "text" =>
  payload.collections[collectionSlug]?.customIDType ?? payload.db.defaultIDType;
