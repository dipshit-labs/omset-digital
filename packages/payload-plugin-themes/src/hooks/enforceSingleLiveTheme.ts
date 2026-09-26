import type { CollectionBeforeChangeHook, CollectionSlug } from "payload";

export const enforceSingleLiveTheme = (
  tenantField = "store",
  themesSlug = "themes"
): CollectionBeforeChangeHook =>
  async function deconflictLiveThemes({ data, originalDoc, req }) {
    if (req.context?.preventLiveThemeSync) {
      return data;
    }

    if (data?.isLive) {
      const storeId = data[tenantField] ?? originalDoc?.[tenantField];
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
            ...(storeId !== undefined && storeId !== null
              ? [{ [tenantField]: { equals: storeId } }]
              : []),
            ...(currentId !== undefined && currentId !== null
              ? [{ id: { not_equals: currentId } }]
              : []),
          ],
        },
      });
    }

    return data;
  };
