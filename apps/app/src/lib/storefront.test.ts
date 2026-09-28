// @vitest-environment node
import type { Store, Template, Theme } from "@repo/types";
import type { PaginatedDocs } from "payload";
import { describe, expect, it } from "vitest";

import type { StorefrontPayloadClient } from "./storefront";
import { resolveStore, resolveStorefront } from "./storefront";

interface WhereCondition {
  customDomain?: { equals?: string };
  isLive?: { equals?: boolean };
  slug?: { equals?: string };
  store?: { equals?: number | string };
  theme?: { equals?: number | string };
  type?: { equals?: string };
}

interface WhereQuery extends WhereCondition {
  and?: WhereCondition[];
}

const matchStore = (store: Store, condition: WhereCondition): boolean => {
  if (
    condition.customDomain &&
    store.customDomain !== condition.customDomain.equals
  ) {
    return false;
  }

  if (condition.slug && store.slug !== condition.slug.equals) {
    return false;
  }

  return true;
};

const matchTheme = (theme: Theme, condition: WhereCondition): boolean => {
  if (
    condition.isLive !== undefined &&
    theme.isLive !== condition.isLive.equals
  ) {
    return false;
  }

  if (condition.slug && theme.slug !== condition.slug.equals) {
    return false;
  }

  if (condition.store !== undefined) {
    const storeId =
      typeof theme.store === "object" ? theme.store?.id : theme.store;
    if (storeId !== condition.store.equals) {
      return false;
    }
  }

  return true;
};

const matchTemplate = (
  template: Template,
  condition: WhereCondition
): boolean => {
  if (condition.type && template.type !== condition.type.equals) {
    return false;
  }

  if (condition.theme !== undefined) {
    const themeId =
      typeof template.theme === "object" ? template.theme?.id : template.theme;
    if (themeId !== condition.theme.equals) {
      return false;
    }
  }

  return true;
};

const filterStores = (stores: Store[], where: unknown): Store[] => {
  if (!where) {
    return stores;
  }
  // SAFETY: Mock test payload receives structured query condition.
  const query = where as WhereQuery;
  return stores.filter((store) => {
    if (query.and) {
      return query.and.every((cond) => matchStore(store, cond));
    }
    return matchStore(store, query);
  });
};

const filterThemes = (themes: Theme[], where: unknown): Theme[] => {
  if (!where) {
    return themes;
  }
  // SAFETY: Mock test payload receives structured query condition.
  const query = where as WhereQuery;
  return themes.filter((theme) => {
    if (query.and) {
      return query.and.every((cond) => matchTheme(theme, cond));
    }
    return matchTheme(theme, query);
  });
};

const filterTemplates = (templates: Template[], where: unknown): Template[] => {
  if (!where) {
    return templates;
  }
  // SAFETY: Mock test payload receives structured query condition.
  const query = where as WhereQuery;
  return templates.filter((template) => {
    if (query.and) {
      return query.and.every((cond) => matchTemplate(template, cond));
    }
    return matchTemplate(template, query);
  });
};

const toPaginatedDocs = <T>(docs: T[], limit = 10): PaginatedDocs<T> => ({
  docs,
  hasNextPage: docs.length > limit,
  hasPrevPage: false,
  limit,
  nextPage: null,
  page: 1,
  pagingCounter: 1,
  prevPage: null,
  totalDocs: docs.length,
  totalPages: 1,
});

const createMockPayload = () => {
  const findCalls: {
    collection: string;
    draft?: boolean;
    overrideAccess?: boolean;
  }[] = [];

  const stores: Store[] = [];
  const themes: Theme[] = [];
  const templates: Template[] = [];

  // SAFETY: Mock find method satisfies StorefrontPayloadClient signature.
  const find = (<T>({
    collection,
    draft,
    limit = 10,
    overrideAccess,
    where,
  }: {
    collection: string;
    draft?: boolean;
    limit?: number;
    overrideAccess?: boolean;
    where?: unknown;
  }): Promise<PaginatedDocs<T>> => {
    findCalls.push({ collection, draft, overrideAccess });

    if (collection === "stores") {
      const filtered = filterStores(stores, where);
      // SAFETY: Filtered stores collection matches requested Store array.
      return Promise.resolve(
        toPaginatedDocs(filtered.slice(0, limit) as T[], limit)
      );
    }

    if (collection === "themes") {
      const filtered = filterThemes(themes, where);
      // SAFETY: Filtered themes collection matches requested Theme array.
      return Promise.resolve(
        toPaginatedDocs(filtered.slice(0, limit) as T[], limit)
      );
    }

    const filtered = filterTemplates(templates, where);
    // SAFETY: Filtered templates collection matches requested Template array.
    return Promise.resolve(
      toPaginatedDocs(filtered.slice(0, limit) as T[], limit)
    );
  }) as StorefrontPayloadClient["find"];

  const client = { find };
  return { client, findCalls, stores, templates, themes };
};

const createMockStore = (overrides: Partial<Store> = {}): Store => ({
  createdAt: "",
  id: 1,
  name: "Mock Store",
  slug: "mock",
  theme: "default",
  updatedAt: "",
  subscription: {
    status: "trial",
  },
  ...overrides,
});

describe(resolveStore, () => {
  it("resolves store by customDomain", async () => {
    const { client, stores } = createMockPayload();
    stores.push(
      createMockStore({
        customDomain: "toko-kopi.com",
        id: 1,
        name: "Toko Kopi",
        slug: "kopi",
      })
    );

    const store = await resolveStore({
      host: "toko-kopi.com:3000",
      payload: client,
    });

    expect(store?.id).toBe(1);
  });

  it("resolves store by subdomain from host", async () => {
    const { client, stores } = createMockPayload();
    stores.push(
      createMockStore({
        id: 2,
        name: "Batik Store",
        slug: "batik",
      })
    );

    const store = await resolveStore({
      host: "batik.omsetdigital.com",
      payload: client,
    });

    expect(store?.id).toBe(2);
  });

  it("resolves store by explicit storeSlug", async () => {
    const { client, stores } = createMockPayload();
    stores.push(
      createMockStore({
        id: 3,
        name: "Sepatu Store",
        slug: "sepatu",
      })
    );

    const store = await resolveStore({
      payload: client,
      storeSlug: "sepatu",
    });

    expect(store?.id).toBe(3);
  });

  it("falls back to default store when host is plain localhost", async () => {
    const { client, stores } = createMockPayload();
    stores.push(
      createMockStore({
        id: 99,
        name: "Default Store",
        slug: "default",
      })
    );

    const store = await resolveStore({
      host: "localhost:3000",
      payload: client,
    });

    expect(store?.id).toBe(99);
  });
});

describe(resolveStorefront, () => {
  it("returns null if store is unmapped", async () => {
    const { client } = createMockPayload();
    const context = await resolveStorefront({
      host: "unknown-store.com",
      payload: client,
    });

    expect(context).toBeNull();
  });

  it("queries active store and live theme document", async () => {
    const { client, stores, templates, themes } = createMockPayload();
    stores.push(
      createMockStore({
        id: 1,
        name: "Toko Utama",
        slug: "utama",
      })
    );

    themes.push({
      createdAt: "",
      id: 10,
      isLive: true,
      name: "Default Theme",
      slug: "default",
      store: 1,
      updatedAt: "",
      settings: {
        accentColor: "#3b82f6",
        backgroundColor: "#ffffff",
        primaryColor: "#ff0000",
        textColor: "#111111",
      },
    });

    templates.push({
      createdAt: "",
      id: 100,
      name: "Home",
      store: 1,
      theme: 10,
      type: "home",
      updatedAt: "",
      sections: [
        {
          blockType: "default_hero",
          heading: "Hero Title",
          id: "hero-1",
          cta: {
            label: "Test",
            url: "/",
          },
        },
      ],
    });

    const context = await resolveStorefront({
      host: "utama.localhost",
      payload: client,
    });

    expect(context?.store.id).toBe(1);
    expect(context?.theme?.id).toBe(10);
    expect(context?.sections).toHaveLength(1);
    expect(context?.themeCssVars["--primary"]).toBe("#ff0000");
    expect(context?.themeCssVars["--foreground"]).toBe("#111111");
  });

  it("passes draft: true and overrideAccess: true to payload.find when draft mode is enabled", async () => {
    const { client, findCalls, stores, templates, themes } =
      createMockPayload();
    stores.push(
      createMockStore({
        id: 1,
        name: "Toko Utama",
        slug: "utama",
      })
    );

    themes.push({
      createdAt: "",
      id: 10,
      isLive: true,
      name: "Default Theme",
      slug: "default",
      store: 1,
      updatedAt: "",
    });

    templates.push({
      createdAt: "",
      id: 100,
      name: "Home",
      sections: [],
      store: 1,
      theme: 10,
      type: "home",
      updatedAt: "",
    });

    const context = await resolveStorefront({
      draft: true,
      host: "utama.localhost",
      payload: client,
    });

    expect(context).not.toBeNull();
    const themeFind = findCalls.find((call) => call.collection === "themes");
    const templateFind = findCalls.find(
      (call) => call.collection === "templates"
    );

    expect(themeFind?.draft).toBeTruthy();
    expect(themeFind?.overrideAccess).toBeTruthy();
    expect(templateFind?.draft).toBeTruthy();
    expect(templateFind?.overrideAccess).toBeTruthy();
  });

  it("passes draft: false and overrideAccess: false to payload.find when draft mode is disabled", async () => {
    const { client, findCalls, stores, templates, themes } =
      createMockPayload();
    stores.push(
      createMockStore({
        id: 1,
        name: "Toko Utama",
        slug: "utama",
      })
    );

    themes.push({
      createdAt: "",
      id: 10,
      isLive: true,
      name: "Default Theme",
      slug: "default",
      store: 1,
      updatedAt: "",
    });

    templates.push({
      createdAt: "",
      id: 100,
      name: "Home",
      sections: [],
      store: 1,
      theme: 10,
      type: "home",
      updatedAt: "",
    });

    const context = await resolveStorefront({
      draft: false,
      host: "utama.localhost",
      payload: client,
    });

    expect(context).not.toBeNull();
    const themeFind = findCalls.find((call) => call.collection === "themes");
    const templateFind = findCalls.find(
      (call) => call.collection === "templates"
    );

    expect(themeFind?.draft).toBeFalsy();
    expect(themeFind?.overrideAccess).toBeFalsy();
    expect(templateFind?.draft).toBeFalsy();
    expect(templateFind?.overrideAccess).toBeFalsy();
  });

  it("resolves active minimal theme with isolated templates and declarative css vars", async () => {
    const { client, stores, templates, themes } = createMockPayload();
    stores.push(
      createMockStore({
        id: 1,
        name: "Minimal Store",
        slug: "minimal-store",
      })
    );

    themes.push(
      {
        createdAt: "",
        id: 10,
        isLive: false,
        name: "Default Theme",
        slug: "default",
        store: 1,
        updatedAt: "",
        settings: {
          primaryColor: "#0000ff",
        },
      },
      {
        createdAt: "",
        id: 20,
        isLive: true,
        name: "Minimal Theme",
        slug: "minimal",
        store: 1,
        updatedAt: "",
        settings: {
          accentColor: "#71717a",
          backgroundColor: "#f5f5f5",
          fontBody: "var(--font-inter)",
          fontHeading: "var(--font-inter)",
          primaryColor: "#18181b",
          textColor: "#18181b",
        },
      }
    );

    templates.push(
      {
        createdAt: "",
        id: 100,
        name: "Home",
        store: 1,
        theme: 10,
        type: "home",
        updatedAt: "",
        sections: [
          {
            blockType: "default_hero",
            heading: "Default Store Hero",
            id: "def-1",
            cta: {
              label: "Shop",
              url: "/products",
            },
          },
        ],
      },
      {
        createdAt: "",
        id: 200,
        name: "Home",
        store: 1,
        theme: 20,
        type: "home",
        updatedAt: "",
        sections: [
          {
            blockType: "minimal_hero",
            heading: "Minimal Store Hero",
            id: "min-1",
          },
        ],
      }
    );

    const context = await resolveStorefront({
      host: "minimal-store.localhost",
      payload: client,
    });

    expect(context?.theme?.slug).toBe("minimal");
    expect(context?.manifest.slug).toBe("minimal");
    expect(context?.template?.id).toBe(200);
    expect(context?.sections[0]?.blockType).toBe("minimal_hero");
    expect(context?.themeCssVars["--primary"]).toBe("#18181b");
  });

  it("switches active theme from default to minimal dynamically", async () => {
    const { client, stores, templates, themes } = createMockPayload();
    stores.push(
      createMockStore({
        id: 1,
        name: "Dual Theme Store",
        slug: "dual-theme",
      })
    );

    const defaultThemeDoc = {
      createdAt: "",
      id: 10,
      isLive: true,
      name: "Customized Default",
      slug: "default",
      store: 1,
      updatedAt: "",
      settings: {
        primaryColor: "#003366",
      },
    };

    const minimalThemeDoc = {
      createdAt: "",
      id: 20,
      isLive: false,
      name: "Customized Minimal",
      slug: "minimal",
      store: 1,
      updatedAt: "",
      settings: {
        primaryColor: "#222222",
      },
    };

    themes.push(defaultThemeDoc, minimalThemeDoc);

    templates.push(
      {
        createdAt: "",
        id: 100,
        name: "Default Home",
        store: 1,
        theme: 10,
        type: "home",
        updatedAt: "",
        sections: [
          {
            blockType: "default_hero",
            heading: "Preserved Default Content",
            id: "def-1",
            cta: {
              label: "Shop",
              url: "/products",
            },
          },
        ],
      },
      {
        createdAt: "",
        id: 200,
        name: "Minimal Home",
        store: 1,
        theme: 20,
        type: "home",
        updatedAt: "",
        sections: [
          {
            blockType: "minimal_hero",
            heading: "Preserved Minimal Content",
            id: "min-1",
          },
        ],
      }
    );

    // When default theme is live
    const defaultContext = await resolveStorefront({
      host: "dual-theme.localhost",
      payload: client,
    });
    expect(defaultContext?.theme?.slug).toBe("default");
    expect(defaultContext?.sections[0]?.blockType).toBe("default_hero");
    expect(defaultContext?.themeCssVars["--primary"]).toBe("#003366");

    // Merchant switches active theme to minimal
    defaultThemeDoc.isLive = false;
    minimalThemeDoc.isLive = true;

    const minimalContext = await resolveStorefront({
      host: "dual-theme.localhost",
      payload: client,
    });
    expect(minimalContext?.theme?.slug).toBe("minimal");
    expect(minimalContext?.sections[0]?.blockType).toBe("minimal_hero");
  });

  it("switches back to default theme preserving customizations", async () => {
    const { client, stores, templates, themes } = createMockPayload();
    stores.push(
      createMockStore({
        id: 1,
        name: "Dual Theme Store",
        slug: "dual-theme",
      })
    );

    const defaultThemeDoc = {
      createdAt: "",
      id: 10,
      isLive: false,
      name: "Customized Default",
      slug: "default",
      store: 1,
      updatedAt: "",
      settings: {
        primaryColor: "#003366",
      },
    };

    const minimalThemeDoc = {
      createdAt: "",
      id: 20,
      isLive: true,
      name: "Customized Minimal",
      slug: "minimal",
      store: 1,
      updatedAt: "",
      settings: {
        primaryColor: "#222222",
      },
    };

    themes.push(defaultThemeDoc, minimalThemeDoc);

    templates.push(
      {
        createdAt: "",
        id: 100,
        name: "Default Home",
        store: 1,
        theme: 10,
        type: "home",
        updatedAt: "",
        sections: [
          {
            blockType: "default_hero",
            heading: "Preserved Default Content",
            id: "def-1",
            cta: {
              label: "Shop",
              url: "/products",
            },
          },
        ],
      },
      {
        createdAt: "",
        id: 200,
        name: "Minimal Home",
        store: 1,
        theme: 20,
        type: "home",
        updatedAt: "",
        sections: [
          {
            blockType: "minimal_hero",
            heading: "Preserved Minimal Content",
            id: "min-1",
          },
        ],
      }
    );

    // Merchant switches back to default theme
    defaultThemeDoc.isLive = true;
    minimalThemeDoc.isLive = false;

    const restoredContext = await resolveStorefront({
      host: "dual-theme.localhost",
      payload: client,
    });
    expect(restoredContext?.theme?.slug).toBe("default");
    expect(restoredContext?.sections[0]?.blockType).toBe("default_hero");
    expect(restoredContext?.themeCssVars["--primary"]).toBe("#003366");
  });
});
