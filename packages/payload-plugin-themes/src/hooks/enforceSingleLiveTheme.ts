import type { CollectionBeforeChangeHook, CollectionSlug } from "payload";

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
  tenantField = "store",
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

    const rawStore = data?.[tenantField] ?? originalDoc?.[tenantField];
    const storeId = resolveStoreId(rawStore);
    if (storeId === undefined) {
      return data;
    }

    const currentId = originalDoc?.id ?? data.id;

    await req.payload.update({
      // SAFETY: themesSlug dynamically resolves to the configured themes CollectionSlug.
      collection: themesSlug as CollectionSlug,
      data: { isLive: false },
      req,
      context: {
        ...req.context,
        preventLiveThemeSync: true,
      },
      where: {
        and: [
          { [tenantField]: { equals: storeId } },
          ...(currentId !== undefined && currentId !== null
            ? [{ id: { not_equals: currentId } }]
            : []),
        ],
      },
    });

    return data;
  };
