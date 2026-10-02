import { describe, expect, it } from "vitest";

import { resolveDocumentStoreId } from "./store";

describe(resolveDocumentStoreId, () => {
  it("resolves numeric store ID from data.store", () => {
    const storeId = resolveDocumentStoreId({ store: 42 });
    expect(storeId).toBe(42);
  });

  it("resolves string store ID from data.store", () => {
    const storeId = resolveDocumentStoreId({ store: "store-uuid-123" });
    expect(storeId).toBe("store-uuid-123");
  });

  it("resolves store ID from populated document object in data.store", () => {
    const storeId = resolveDocumentStoreId({ store: { id: 99, name: "Shop" } });
    expect(storeId).toBe(99);
  });

  it("falls back to originalDoc.store when data.store is undefined", () => {
    const storeId = resolveDocumentStoreId({}, { store: 101 });
    expect(storeId).toBe(101);
  });

  it("falls back to originalDoc.store when data.store is null", () => {
    const storeId = resolveDocumentStoreId({ store: null }, { store: 102 });
    expect(storeId).toBe(102);
  });

  it("prioritizes data.store over originalDoc.store", () => {
    const storeId = resolveDocumentStoreId({ store: 50 }, { store: 60 });
    expect(storeId).toBe(50);
  });

  it("returns null when neither data nor originalDoc contains a valid store", () => {
    expect(resolveDocumentStoreId()).toBeNull();
    expect(resolveDocumentStoreId({})).toBeNull();
    expect(resolveDocumentStoreId({ store: null }, { store: null })).toBeNull();
    expect(
      resolveDocumentStoreId({ store: undefined }, { store: undefined })
    ).toBeNull();
  });

  it("returns null when store object has no valid id property", () => {
    expect(resolveDocumentStoreId({ store: {} })).toBeNull();
    expect(resolveDocumentStoreId({ store: { id: null } })).toBeNull();
  });
});
