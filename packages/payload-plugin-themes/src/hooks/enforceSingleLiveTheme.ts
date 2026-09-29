import type {
  CollectionBeforeChangeHook,
  CollectionSlug,
  Where,
} from "payload";

const resolveStoreId = (rawStore: unknown): number | string | undefined => {
  if (typeof rawStore === "string" || typeof rawStore === "number") {
    return rawStore;
  }
  if (rawStore && typeof rawStore === "object" && "id" in rawStore) {
    const { id } = rawStore;
    if (typeof id === "string" || typeof id === "number") {
      return id;
    }
  }
  return undefined;
};

export const enforceSingleLiveTheme = (
  tenantField?: string,
  themesSlug = "themes"
): CollectionBeforeChangeHook =>
  async function deconflictLiveThemes({ data, originalDoc, req }) {
    if (req.context?.preventLiveThemeSync) {
      return data;
    }

    // Do not deactivate published live themes during draft autosaves
    if (data?._status === "draft") {
      return data;
    }

    const isActivating = Boolean(data?.isLive && !originalDoc?.isLive);
    if (!isActivating) {
      return data;
    }

    const currentId = originalDoc?.id ?? data.id;
    const andConditions: Where[] = [];

    if (tenantField) {
      const rawStore = data?.[tenantField] ?? originalDoc?.[tenantField];
      const storeId = resolveStoreId(rawStore);
      if (storeId === undefined) {
        return data;
      }
      andConditions.push({ [tenantField]: { equals: storeId } });
    }

    if (currentId !== undefined && currentId !== null) {
      andConditions.push({ id: { not_equals: currentId } });
    }

    const where: Where = andConditions.length > 0 ? { and: andConditions } : {};

    await req.payload.update({
      // SAFETY: themesSlug dynamically resolves to the configured themes CollectionSlug.
      collection: themesSlug as CollectionSlug,
      data: { isLive: false },
      req,
      where,
      context: {
        ...req.context,
        preventLiveThemeSync: true,
      },
    });

    return data;
  };
