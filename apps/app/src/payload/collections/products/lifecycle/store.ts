export interface DocumentWithStore {
  store?: unknown;
}

/**
 * Resolves the active Store tenant identifier strictly from document fields.
 * Never inspects request headers, cookies, or external environment.
 */
export const resolveDocumentStoreId = (
  data?: DocumentWithStore | null,
  originalDoc?: DocumentWithStore | null
): number | string | null => {
  const storeRaw = data?.store ?? originalDoc?.store;
  if (!storeRaw) {
    return null;
  }

  if (typeof storeRaw === "number" || typeof storeRaw === "string") {
    return storeRaw;
  }

  if (typeof storeRaw === "object" && "id" in storeRaw) {
    // SAFETY: Populated document relationships expose an id property.
    const { id } = storeRaw as { id: unknown };
    if (typeof id === "number" || typeof id === "string") {
      return id;
    }
  }

  return null;
};
