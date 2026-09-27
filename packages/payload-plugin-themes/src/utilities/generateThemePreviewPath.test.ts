import { describe, expect, it } from "vitest";

import { generateThemePreviewPath } from "./generateThemePreviewPath";

describe(generateThemePreviewPath, () => {
  it("formats preview path with /next/preview endpoint and previewSecret", () => {
    const url = generateThemePreviewPath({
      path: "/about",
      previewSecret: "explicit-secret",
    });

    expect(url).toBe(
      "/next/preview?path=%2Fabout&previewSecret=explicit-secret"
    );
  });

  it("omits previewSecret query param when previewSecret option is omitted", () => {
    const url = generateThemePreviewPath({
      path: "/contact",
    });

    expect(url).toBe("/next/preview?path=%2Fcontact");
  });

  it("prefixes multi-tenant storeSlug to root path", () => {
    const url = generateThemePreviewPath({
      path: "/",
      previewSecret: "secret",
      storeSlug: "store-a",
    });

    expect(url).toBe("/next/preview?path=%2Fstore-a&previewSecret=secret");
  });

  it("prefixes multi-tenant storeSlug to nested subpath", () => {
    const url = generateThemePreviewPath({
      path: "/products/kopi-tubruk",
      previewSecret: "secret",
      storeSlug: "store-a",
    });

    expect(url).toBe(
      "/next/preview?path=%2Fstore-a%2Fproducts%2Fkopi-tubruk&previewSecret=secret"
    );
  });

  it("avoids duplicate storeSlug prefix if path already begins with storeSlug", () => {
    const url = generateThemePreviewPath({
      path: "/store-a/products",
      previewSecret: "secret",
      storeSlug: "store-a",
    });

    expect(url).toBe(
      "/next/preview?path=%2Fstore-a%2Fproducts&previewSecret=secret"
    );
  });

  it("resolves store home route when collection is themes", () => {
    const url = generateThemePreviewPath({
      collection: "themes",
      previewSecret: "secret",
      storeSlug: "warung-kopi",
    });

    expect(url).toBe("/next/preview?path=%2Fwarung-kopi&previewSecret=secret");
  });

  it("supports custom previewEndpoint", () => {
    const url = generateThemePreviewPath({
      path: "/test",
      previewEndpoint: "/api/preview",
      previewSecret: "secret",
    });

    expect(url).toBe("/api/preview?path=%2Ftest&previewSecret=secret");
  });

  it("normalizes paths without leading slashes", () => {
    const url = generateThemePreviewPath({
      path: "products/shoes",
      previewSecret: "secret",
      storeSlug: "toko",
    });

    expect(url).toBe(
      "/next/preview?path=%2Ftoko%2Fproducts%2Fshoes&previewSecret=secret"
    );
  });
});
