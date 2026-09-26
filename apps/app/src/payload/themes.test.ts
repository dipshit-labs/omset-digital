// @vitest-environment node
import type { Block, CollectionConfig, Field, GroupField } from "payload";
import { describe, expect, it } from "vitest";

import payloadConfig from "./payload.config";

describe("Theme Plugin Integration", () => {
  it("injects themes collection into Payload config", async () => {
    const config = await payloadConfig;
    const collectionSlugs = (config.collections || []).map(
      (c: CollectionConfig) => c.slug
    );

    expect(collectionSlugs).toContain("themes");
  });

  it("injects templates collection into Payload config", async () => {
    const config = await payloadConfig;
    const collectionSlugs = (config.collections || []).map(
      (c: CollectionConfig) => c.slug
    );

    expect(collectionSlugs).toContain("templates");
  });

  it("configures themes collection core fields and store relation", async () => {
    const config = await payloadConfig;
    const themes = config.collections?.find(
      (c: CollectionConfig) => c.slug === "themes"
    );
    const fieldNames = (themes?.fields || []).map((f: Field) =>
      "name" in f ? f.name : ""
    );

    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("slug");
    expect(fieldNames).toContain("isLive");
    expect(fieldNames).toContain("store");
  });

  it("configures themes branding settings fields", async () => {
    const config = await payloadConfig;
    const themes = config.collections?.find(
      (c: CollectionConfig) => c.slug === "themes"
    );
    // SAFETY: Settings field is defined as GroupField in createThemesCollection
    const settingsField = themes?.fields.find(
      (f: Field) => "name" in f && f.name === "settings"
    ) as GroupField;

    const subfieldNames = (settingsField.fields || []).map((f: Field) =>
      "name" in f ? f.name : ""
    );

    expect(subfieldNames).toContain("primaryColor");
    expect(subfieldNames).toContain("accentColor");
    expect(subfieldNames).toContain("backgroundColor");
    expect(subfieldNames).toContain("fontHeading");
    expect(subfieldNames).toContain("fontBody");
  });

  it("configures templates collection core fields and store relation", async () => {
    const config = await payloadConfig;
    const templates = config.collections?.find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    const fieldNames = (templates?.fields || []).map((f: Field) =>
      "name" in f ? f.name : ""
    );

    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("type");
    expect(fieldNames).toContain("theme");
    expect(fieldNames).toContain("sections");
    expect(fieldNames).toContain("store");
  });

  it("registers default_hero section block on templates", async () => {
    const config = await payloadConfig;
    const templates = config.collections?.find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    // SAFETY: Sections field is defined as BlocksField with blocks array
    const sectionsField = templates?.fields.find(
      (f: Field) => "name" in f && f.name === "sections"
    ) as { blocks: Block[] };
    const blockSlugs = sectionsField.blocks.map((b: Block) => b.slug);

    expect(blockSlugs).toContain("default_hero");
  });

  it("registers bullet child block inside default_hero block", async () => {
    const config = await payloadConfig;
    const templates = config.collections?.find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    // SAFETY: Sections field is defined as BlocksField with blocks array
    const sectionsField = templates?.fields.find(
      (f: Field) => "name" in f && f.name === "sections"
    ) as { blocks: Block[] };
    const heroBlock = sectionsField.blocks.find(
      (b: Block) => b.slug === "default_hero"
    );
    // SAFETY: Hero block contains blocks field for child block definitions
    const childBlocksField = heroBlock?.fields.find(
      (f: Field) => "name" in f && f.name === "blocks"
    ) as { blocks: Block[] };
    const childBlockSlugs = childBlocksField.blocks.map((b: Block) => b.slug);

    expect(childBlockSlugs).toContain("bullet");
  });
});
