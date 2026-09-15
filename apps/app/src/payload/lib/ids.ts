import type { CollectionSlug, Payload } from "payload";
import type { Config, Tenant, User } from "@/payload/payload-types";

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

export const getUserTenantIDs = (
  user: null | undefined | User,
  role?: NonNullable<User["tenants"]>[number]["roles"][number]
): Tenant["id"][] => {
  if (!(user && Array.isArray(user.tenants))) {
    return [];
  }

  return user.tenants.reduce<Tenant["id"][]>((acc, item) => {
    if (!item?.tenant) {
      return acc;
    }

    const userRoles = item.roles ?? [];

    if (role && !userRoles.includes(role)) {
      return acc;
    }

    acc.push(extractID<Tenant>(item.tenant));
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
