import { describe, expect, it } from "vitest";

import { syncThemes } from "./onInit.js";
import type { ThemeManifestDefinition, ThemeSettingValue } from "./types.js";

interface MockDoc {
  id: string;
  [key: string]: ThemeSettingValue;
}

interface MockCollections {
  stores: MockDoc[];
  templates: MockDoc[];
  themes: MockDoc[];
}

const createMockPayload = () => {
  const collections: MockCollections = {
    stores: [],
    templates: [],
    themes: [],
  };

  let idCounter = 1;

  const payload = {
    create: ({
      collection,
      data,
    }: {
      collection: string;
      data: Record<string, ThemeSettingValue>;
    }) => {
      const doc: MockDoc = {
        id: `mock-id-${idCounter}`,
        ...data,
      };

      idCounter += 1;
      if (collection === "stores") {
        collections.stores.push(doc);
      } else if (collection === "themes") {
        collections.themes.push(doc);
      } else if (collection === "templates") {
        collections.templates.push(doc);
      }

      return Promise.resolve(doc);
    },
    find: ({
      collection,
      limit = 10,
      page = 1,
      where,
    }: {
      collection: string;
      limit?: number;
      page?: number;
      where?: Record<string, ThemeSettingValue>;
    }) => {
      let docs: MockDoc[] = [];
      if (collection === "stores") {
        docs = collections.stores;
      } else if (collection === "themes") {
        docs = collections.themes;
      } else {
        docs = collections.templates;
      }

      if (where?.and && Array.isArray(where.and)) {
        for (const condition of where.and) {
          if (condition && typeof condition === "object") {
            for (const [key, val] of Object.entries(condition)) {
              if (val && typeof val === "object" && "equals" in val) {
                // SAFETY: Condition contains equals filter for field value match.
                const expected = (val as { equals: unknown }).equals;
                docs = docs.filter((doc) => doc[key] === expected);
              }
            }
          }
        }
      }

      const totalDocs = docs.length;
      const startIndex = (page - 1) * limit;
      const paginatedDocs = docs.slice(startIndex, startIndex + limit);
      const totalPages = Math.ceil(totalDocs / limit);

      return Promise.resolve({
        docs: paginatedDocs,
        hasNextPage: page < totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        page,
        totalDocs,
        totalPages,
      });
    },
  };

  return { collections, payload };
};

const mockManifest: ThemeManifestDefinition = {
  name: "Default Theme",
  slug: "default",
  version: "1.0.0",
  sections: [
    {
      name: "Hero",
      slug: "hero",
      settings: [
        {
          defaultValue: "Hello World",
          label: "Heading",
          name: "heading",
          type: "text",
        },
      ],
    },
  ],
  settings: [
    {
      defaultValue: "#0070f3",
      label: "Primary Color",
      name: "primaryColor",
      type: "color",
    },
  ],
  templates: [
    {
      name: "Home",
      type: "home",
      sections: [
        {
          blockType: "hero",
          heading: "Welcome",
        },
      ],
    },
  ],
};

describe(syncThemes, () => {
  it("provisions fallback trial store if database has no stores", async () => {
    const { collections, payload } = createMockPayload();

    await syncThemes(payload, {
      manifests: [mockManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    expect(collections.stores).toHaveLength(1);

    const [store] = collections.stores;
    expect(store.name).toBe("Default Store");
    expect(store.slug).toBe("default");

    // SAFETY: Store subscription shape in mock doc conforms to Subscription group.
    const sub = store.subscription as { status?: string } | undefined;
    expect(sub?.status).toBe("trial");
  });

  it("provisions theme and template for existing stores", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    await syncThemes(payload, {
      manifests: [mockManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    expect(collections.themes).toHaveLength(1);

    const [theme] = collections.themes;
    expect(theme).toMatchObject({
      isLive: true,
      slug: "default",
      store: "store-123",
    });

    expect(collections.templates).toHaveLength(1);

    const [template] = collections.templates;
    expect(template).toMatchObject({
      name: "Home",
      store: "store-123",
      theme: theme.id,
      type: "home",
    });
  });

  it("is idempotent on repeated sync runs", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    const options = {
      manifests: [mockManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    };

    await syncThemes(payload, options);
    await syncThemes(payload, options);

    expect(collections.themes).toHaveLength(1);
    expect(collections.templates).toHaveLength(1);
  });

  it("supports custom defaultStoreData when provisioning fallback store", async () => {
    const { collections, payload } = createMockPayload();

    await syncThemes(payload, {
      manifests: [mockManifest],
      tenantField: "store",
      tenantsSlug: "stores",
      defaultStoreData: {
        customField: "custom-value",
        name: "Custom Trial Store",
        slug: "custom-trial",
      },
    });

    expect(collections.stores).toHaveLength(1);

    const [store] = collections.stores;
    expect(store.name).toBe("Custom Trial Store");
    expect(store.slug).toBe("custom-trial");
    expect(store.customField).toBe("custom-value");
  });

  it("paginates through all stores when store count exceeds page size", async () => {
    const { collections, payload } = createMockPayload();
    // Populate 150 stores to test multiple pages
    for (let i = 1; i <= 150; i += 1) {
      collections.stores.push({
        id: `store-${i}`,
        name: `Store ${i}`,
        slug: `store-${i}`,
      });
    }

    await syncThemes(payload, {
      manifests: [mockManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    // All 150 stores should have a theme provisioned
    expect(collections.themes).toHaveLength(150);
    expect(collections.templates).toHaveLength(150);
  });
});
