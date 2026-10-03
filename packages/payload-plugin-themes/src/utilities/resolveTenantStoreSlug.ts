import type { CollectionSlug, PayloadRequest } from "payload";

type TenantFieldValue =
  | { id?: number | string; slug?: string }
  | number
  | string
  | null
  | undefined;

interface TenantDataRecord {
  [key: string]: TenantFieldValue;
}

export interface ResolveTenantStoreSlugOptions {
  data?: TenantDataRecord | null;
  req?: PayloadRequest | null;
  tenantField?: string;
  tenantsSlug?: string;
}

const queryStoreSlugById = async (
  req: PayloadRequest | null | undefined,
  tenantsSlug: string,
  id: number | string
): Promise<string | null> => {
  if (!req?.payload) {
    return null;
  }

  try {
    // SAFETY: tenantsSlug dynamically targets the configured multi-tenant collection (e.g. "stores").
    const targetCollection = tenantsSlug as CollectionSlug;
    const storeDoc = await req.payload.findByID({
      collection: targetCollection,
      depth: 0,
      id,
    });

    if (
      storeDoc &&
      typeof storeDoc === "object" &&
      "slug" in storeDoc &&
      typeof storeDoc.slug === "string"
    ) {
      return storeDoc.slug;
    }
  } catch {
    // Fall through when store cannot be queried by id
  }

  return null;
};

const resolveFromStoreValue = (
  storeVal: TenantFieldValue,
  req: PayloadRequest | null | undefined,
  tenantsSlug: string
): Promise<string | null> => {
  if (
    storeVal &&
    typeof storeVal === "object" &&
    "slug" in storeVal &&
    typeof storeVal.slug === "string"
  ) {
    return Promise.resolve(storeVal.slug);
  }

  if (
    storeVal &&
    typeof storeVal === "object" &&
    "id" in storeVal &&
    (typeof storeVal.id === "string" || typeof storeVal.id === "number")
  ) {
    return queryStoreSlugById(req, tenantsSlug, storeVal.id);
  }

  if (typeof storeVal === "string" || typeof storeVal === "number") {
    return queryStoreSlugById(req, tenantsSlug, storeVal);
  }

  return Promise.resolve(null);
};
const resolveFromUser = (
  req: PayloadRequest | null | undefined,
  tenantsSlug: string
): Promise<string | null> => {
  if (!req?.user || typeof req.user !== "object") {
    return Promise.resolve(null);
  }

  // SAFETY: Payload multi-tenant plugin attaches lastActiveStore to session user.
  const userWithStore = req.user as {
    lastActiveStore?: { id?: number | string; slug?: string } | number | string;
  };
  const lastActive = userWithStore.lastActiveStore;

  if (
    lastActive &&
    typeof lastActive === "object" &&
    "slug" in lastActive &&
    typeof lastActive.slug === "string"
  ) {
    return Promise.resolve(lastActive.slug);
  }

  if (
    lastActive &&
    typeof lastActive === "object" &&
    "id" in lastActive &&
    (typeof lastActive.id === "string" || typeof lastActive.id === "number")
  ) {
    return queryStoreSlugById(req, tenantsSlug, lastActive.id);
  }

  if (typeof lastActive === "string" || typeof lastActive === "number") {
    return queryStoreSlugById(req, tenantsSlug, lastActive);
  }
  return Promise.resolve(null);
};

export const resolveTenantStoreSlug = async ({
  data,
  req,
  tenantField = "store",
  tenantsSlug = "stores",
}: ResolveTenantStoreSlugOptions): Promise<string | null> => {
  if (data && typeof data === "object") {
    const storeVal = data[tenantField];
    const resolved = await resolveFromStoreValue(storeVal, req, tenantsSlug);
    if (resolved) {
      return resolved;
    }
  }

  return resolveFromUser(req, tenantsSlug);
};
