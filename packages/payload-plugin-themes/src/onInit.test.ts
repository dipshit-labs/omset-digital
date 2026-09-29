import { describe, expect, it } from "vitest";

import { syncThemes } from "./onInit";
import type { ThemeManifestDefinition, ThemeSettingValue } from "./types";

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

const mockMinimalManifest: ThemeManifestDefinition = {
  name: "Minimal Theme",
  slug: "minimal",
  version: "1.0.0",
  sections: [
    {
      name: "Hero",
      slug: "hero",
      settings: [
        {
          defaultValue: "Minimal",
          label: "Heading",
          name: "heading",
          type: "text",
        },
      ],
    },
  ],
  settings: [
    {
      defaultValue: "#171717",
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
          heading: "Minimal Home",
        },
      ],
    },
  ],
};

describe(syncThemes, () => {
  it("does not auto-create stores when database has no stores", async () => {
    const { collections, payload } = createMockPayload();

    await syncThemes(payload, {
      manifests: [mockManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    expect(collections.stores).toHaveLength(0);
    expect(collections.themes).toHaveLength(0);
    expect(collections.templates).toHaveLength(0);
  });

  it("skips theme sync when tenantField is not provided", async () => {
    const { collections, payload } = createMockPayload();

    await syncThemes(payload, {
      manifests: [mockManifest],
    });

    expect(collections.stores).toHaveLength(0);
    expect(collections.themes).toHaveLength(0);
    expect(collections.templates).toHaveLength(0);
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

    expect(collections.themes).toStrictEqual([
      expect.objectContaining({
        isLive: true,
        slug: "default",
        store: "store-123",
      }),
    ]);
    expect(collections.templates).toStrictEqual([
      expect.objectContaining({
        name: "Home",
        store: "store-123",
        theme: collections.themes[0]?.id,
        type: "home",
      }),
    ]);
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

  it("provisions both themes for a store with exactly one live theme", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    await syncThemes(payload, {
      manifests: [mockManifest, mockMinimalManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    expect(collections.themes).toHaveLength(2);
    const defaultThemeDoc = collections.themes.find(
      (t) => t.slug === "default"
    );
    const minimalThemeDoc = collections.themes.find(
      (t) => t.slug === "minimal"
    );

    expect(defaultThemeDoc).toMatchObject({
      isLive: true,
      slug: "default",
      store: "store-123",
    });
    expect(minimalThemeDoc).toMatchObject({
      isLive: false,
      slug: "minimal",
      store: "store-123",
    });
  });

  it("provisions isolated templates for both themes", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    await syncThemes(payload, {
      manifests: [mockManifest, mockMinimalManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    expect(collections.templates).toHaveLength(2);
    const defaultTemplate = collections.templates.find(
      (t) =>
        // SAFETY: Mock template doc sections array contains section blocks.
        (t.sections as { blockType: string }[])[0]?.blockType === "default_hero"
    );
    const minimalTemplate = collections.templates.find(
      (t) =>
        // SAFETY: Mock template doc sections array contains section blocks.
        (t.sections as { blockType: string }[])[0]?.blockType === "minimal_hero"
    );

    expect(defaultTemplate?.type).toBe("home");
    expect(minimalTemplate?.type).toBe("home");
    expect(defaultTemplate?.theme).not.toBe(minimalTemplate?.theme);
  });

  it("preserves merchant theme settings and live status when provisioning a new theme", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    collections.themes.push({
      id: "existing-default-theme",
      isLive: true,
      name: "Customized Theme",
      slug: "default",
      store: "store-123",
      settings: {
        primaryColor: "#ff0000",
      },
    });

    await syncThemes(payload, {
      manifests: [mockManifest, mockMinimalManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    expect(collections.themes).toHaveLength(2);
    const defaultThemeDoc = collections.themes.find(
      (t) => t.slug === "default"
    );
    const minimalThemeDoc = collections.themes.find(
      (t) => t.slug === "minimal"
    );

    expect(defaultThemeDoc).toMatchObject({
      id: "existing-default-theme",
      isLive: true,
      settings: { primaryColor: "#ff0000" },
    });
    expect(minimalThemeDoc).toMatchObject({
      isLive: false,
      slug: "minimal",
      store: "store-123",
    });
  });

  it("preserves merchant template customizations when provisioning a newly added theme", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    collections.themes.push({
      id: "existing-default-theme",
      isLive: true,
      name: "Customized Theme",
      slug: "default",
      store: "store-123",
    });
    collections.templates.push({
      id: "existing-template",
      name: "Customized Home",
      store: "store-123",
      theme: "existing-default-theme",
      type: "home",
      sections: [
        {
          blockType: "default_hero",
          heading: "Merchant Customized Heading",
        },
      ],
    });

    await syncThemes(payload, {
      manifests: [mockManifest, mockMinimalManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    const defaultTemplate = collections.templates.find(
      (t) => t.theme === "existing-default-theme"
    );
    // SAFETY: sections on mock template doc is an array of section blocks.
    const sections = defaultTemplate?.sections as { heading: string }[];
    expect(sections[0]?.heading).toBe("Merchant Customized Heading");

    const minimalTemplate = collections.templates.find(
      (t) => t.theme !== "existing-default-theme"
    );
    expect(minimalTemplate).toBeDefined();
  });

  it("does not overwrite live status when merchant activated minimal theme", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    collections.themes.push(
      {
        id: "default-theme-id",
        isLive: false,
        name: "Default Theme",
        slug: "default",
        store: "store-123",
      },
      {
        id: "minimal-theme-id",
        isLive: true,
        name: "Minimal Theme",
        slug: "minimal",
        store: "store-123",
      }
    );

    await syncThemes(payload, {
      manifests: [mockManifest, mockMinimalManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    const defaultThemeDoc = collections.themes.find(
      (t) => t.slug === "default"
    );
    const minimalThemeDoc = collections.themes.find(
      (t) => t.slug === "minimal"
    );

    expect(defaultThemeDoc?.isLive).toBeFalsy();
    expect(minimalThemeDoc?.isLive).toBeTruthy();
  });

  it("does not activate first manifest when store already has another active theme", async () => {
    const { collections, payload } = createMockPayload();
    collections.stores.push({
      id: "store-123",
      name: "Acme Store",
      slug: "acme",
    });

    collections.themes.push({
      id: "minimal-theme-id",
      isLive: true,
      name: "Minimal Theme",
      slug: "minimal",
      store: "store-123",
    });

    await syncThemes(payload, {
      manifests: [mockManifest, mockMinimalManifest],
      tenantField: "store",
      tenantsSlug: "stores",
    });

    const defaultThemeDoc = collections.themes.find(
      (t) => t.slug === "default"
    );
    const minimalThemeDoc = collections.themes.find(
      (t) => t.slug === "minimal"
    );

    expect(defaultThemeDoc?.isLive).toBeFalsy();
    expect(minimalThemeDoc?.isLive).toBeTruthy();
  });
});
