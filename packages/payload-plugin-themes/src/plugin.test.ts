import type { Block, CollectionConfig, Config, Field } from "payload";
import type { ThemeManifestDefinition } from "@repo/theme-core";

import { describe, expect, it } from "vitest";

import { themesPlugin } from "./index";

const sampleManifest: ThemeManifestDefinition = {
  name: "Starter Theme",
  slug: "starter",
  version: "1.0.0",
  sections: [
    {
      name: "Banner",
      slug: "banner",
      settings: [
        {
          name: "title",
          type: "text",
          label: "Title",
        },
      ],
    },
  ],
  settings: [
    {
      name: "accentColor",
      type: "color",
      label: "Accent Color",
    },
  ],
};

const createTestConfig = (collections: CollectionConfig[] = []): Config => {
  const partial = { collections };

  // SAFETY: Testing plugin collection injection on partial Config.
  return partial as Config;
};

describe(themesPlugin, () => {
  it("injects themes and templates collections into incoming config", async () => {
    const plugin = themesPlugin({
      manifests: [sampleManifest],
    });

    const config = createTestConfig();
    const modifiedConfig = await plugin(config);

    expect(modifiedConfig.collections).toBeDefined();
    const collectionSlugs = (modifiedConfig.collections || []).map(
      (c: CollectionConfig) => c.slug
    );
    expect(collectionSlugs).toContain("themes");
    expect(collectionSlugs).toContain("templates");
  });

  it("registers namespaced section blocks in templates.sections field", async () => {
    const plugin = themesPlugin({
      manifests: [sampleManifest],
    });

    const config = createTestConfig();
    const modifiedConfig = await plugin(config);

    const templatesCollection = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    expect(templatesCollection).toBeDefined();

    // SAFETY: sections field in templates collection is configured as blocks type.
    const sectionsField = templatesCollection?.fields.find(
      (f: Field) => "name" in f && f.name === "sections"
    ) as (Field & { blocks: Block[]; type: "blocks" }) | undefined;
    expect(sectionsField).toBeDefined();

    const blockSlugs = (sectionsField?.blocks || []).map((b: Block) => b.slug);
    expect(blockSlugs).toContain("starter_banner");
  });

  it("preserves collection schema but skips onInit and hooks if enabled is false", async () => {
    const plugin = themesPlugin({
      enabled: false,
      manifests: [sampleManifest],
    });

    const config = createTestConfig();
    const modifiedConfig = await plugin(config);

    const collectionSlugs = (modifiedConfig.collections || []).map(
      (c: CollectionConfig) => c.slug
    );
    expect(collectionSlugs).toContain("themes");
    expect(collectionSlugs).toContain("templates");

    expect(modifiedConfig.onInit).toBeUndefined();

    const themesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "themes"
    );
    expect(themesCol?.hooks?.beforeChange || []).toHaveLength(0);
  });

  it("applies user overrides to generated collections", async () => {
    const plugin = themesPlugin({
      manifests: [sampleManifest],
      overrides: {
        themes: {
          admin: {
            group: "Store Settings",
          },
        },
      },
    });

    const config = createTestConfig();
    const modifiedConfig = await plugin(config);

    const themesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "themes"
    );
    expect(themesCol?.admin?.group).toBe("Store Settings");
  });

  it("merges with existing themes collection instead of overwriting", async () => {
    const existingCustomField: Field = {
      name: "customMeta",
      type: "text",
    };

    const plugin = themesPlugin({
      manifests: [sampleManifest],
    });
    const config = createTestConfig([
      {
        fields: [existingCustomField],
        slug: "themes",
      },
    ]);

    const modifiedConfig = await plugin(config);
    const themesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "themes"
    );

    const fieldNames = (themesCol?.fields || []).map((f: Field) =>
      "name" in f ? f.name : ""
    );
    expect(fieldNames).toContain("customMeta");
    expect(fieldNames).toContain("slug");
    expect(fieldNames).toContain("isLive");
  });

  it("deduplicates setting field names across multiple manifests without schema collision", async () => {
    const secondManifest: ThemeManifestDefinition = {
      name: "Modern Theme",
      sections: [],
      slug: "modern",
      version: "1.0.0",
      settings: [
        {
          name: "accentColor",
          type: "color",
          label: "Accent Color",
        },
        {
          name: "modernSetting",
          type: "text",
          label: "Modern Only Setting",
        },
      ],
    };

    const plugin = themesPlugin({
      manifests: [sampleManifest, secondManifest],
    });

    const config = createTestConfig();
    const modifiedConfig = await plugin(config);
    const themesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "themes"
    );

    // SAFETY: settings field in themes collection is configured as group type.
    const settingsField = themesCol?.fields.find(
      (f: Field) => "name" in f && f.name === "settings"
    ) as (Field & { fields: Field[]; type: "group" }) | undefined;
    expect(settingsField).toBeDefined();

    const subfieldNames = (settingsField?.fields || []).map((f: Field) =>
      "name" in f ? f.name : ""
    );
    const accentOccurrences = subfieldNames.filter((n) => n === "accentColor");
    expect(accentOccurrences).toHaveLength(1);
    expect(subfieldNames).toContain("modernSetting");
  });

  it("supports custom collection slugs via slugs option", async () => {
    const plugin = themesPlugin({
      manifests: [sampleManifest],
      slugs: {
        templates: "store_layouts",
        themes: "store_themes",
      },
    });

    const config = createTestConfig();
    const modifiedConfig = await plugin(config);
    const collectionSlugs = (modifiedConfig.collections || []).map(
      (c: CollectionConfig) => c.slug
    );

    expect(collectionSlugs).toContain("store_themes");
    expect(collectionSlugs).toContain("store_layouts");

    const templatesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "store_layouts"
    );

    // SAFETY: theme field in templates collection is configured as relationship type.
    const themeRelField = templatesCol?.fields.find(
      (f: Field) => "name" in f && f.name === "theme"
    ) as (Field & { relationTo: string; type: "relationship" }) | undefined;
    expect(themeRelField).toBeDefined();
    expect(themeRelField?.relationTo).toBe("store_themes");
  });

  it("preserves admin.livePreview on existing or overridden collections", async () => {
    const plugin = themesPlugin({
      manifests: [sampleManifest],
      previewSecret: "plugin-preview-secret",
    });

    const config = createTestConfig([
      {
        fields: [],
        slug: "themes",
        admin: {
          useAsTitle: "name",
        },
      },
      {
        fields: [],
        slug: "templates",
        admin: {
          useAsTitle: "name",
        },
      },
    ]);

    const modifiedConfig = await plugin(config);
    const themesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "themes"
    );
    const templatesCol = (modifiedConfig.collections || []).find(
      (c: CollectionConfig) => c.slug === "templates"
    );

    expect(themesCol?.admin?.livePreview?.url).toBeTypeOf("function");
    expect(templatesCol?.admin?.livePreview?.url).toBeTypeOf("function");
  });
});
