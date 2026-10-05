import type {
  Block,
  CollectionConfig,
  Field,
  GroupField,
  PayloadRequest,
} from "payload";

import { describe, expect, it } from "vitest";

import { env } from "@/env";
import payloadConfig from "./payload.config";

type LivePreviewUrlFunction = (args: {
  data: Record<string, unknown>;
  req: PayloadRequest;
}) => Promise<string>;

const createMockRequest = (mock: unknown): PayloadRequest =>
  // SAFETY: Duck-typed mock request fulfills PayloadRequest requirements for test.
  mock as PayloadRequest;

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

  it("registers minimal_hero section block on templates", async () => {
    const config = await payloadConfig;
    const templates = config.collections?.find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    // SAFETY: Sections field is defined as BlocksField with blocks array
    const sectionsField = templates?.fields.find(
      (f: Field) => "name" in f && f.name === "sections"
    ) as { blocks: Block[] };
    const blockSlugs = sectionsField.blocks.map((b: Block) => b.slug);

    expect(blockSlugs).toContain("minimal_hero");
  });

  it("registers tag child block inside minimal_hero block", async () => {
    const config = await payloadConfig;
    const templates = config.collections?.find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    // SAFETY: Sections field is defined as BlocksField with blocks array
    const sectionsField = templates?.fields.find(
      (f: Field) => "name" in f && f.name === "sections"
    ) as { blocks: Block[] };
    const heroBlock = sectionsField.blocks.find(
      (b: Block) => b.slug === "minimal_hero"
    );
    // SAFETY: Hero block contains blocks field for child block definitions
    const childBlocksField = heroBlock?.fields.find(
      (f: Field) => "name" in f && f.name === "blocks"
    ) as { blocks: Block[] };
    const childBlockSlugs = childBlocksField.blocks.map((b: Block) => b.slug);

    expect(childBlockSlugs).toContain("tag");
  });

  it("generates theme live preview url with tenant store resolution", async () => {
    const config = await payloadConfig;
    const themes = config.collections?.find(
      (c: CollectionConfig) => c.slug === "themes"
    );
    const rawUrlGetter = themes?.admin?.livePreview?.url;
    expect(rawUrlGetter).toBeTypeOf("function");

    if (typeof rawUrlGetter !== "function") {
      throw new TypeError("Themes admin livePreview url is not a function");
    }
    // SAFETY: Live preview url getter matches LivePreviewUrlFunction contract in tests.
    const urlGetter = rawUrlGetter as LivePreviewUrlFunction;
    const mockPayload = {
      findByID: () => Promise.resolve({ id: 10, slug: "toko-kopi" }),
    };
    const mockReq = createMockRequest({ payload: mockPayload });

    const url = await urlGetter({
      req: mockReq,
      data: {
        name: "Default Theme",
        slug: "default",
        store: 10,
      },
    });

    expect(url).toBe(
      `/next/preview?path=%2Ftoko-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );
  });

  it("generates template live preview url with tenant store resolution for each template type", async () => {
    const config = await payloadConfig;
    const templates = config.collections?.find(
      (c: CollectionConfig) => c.slug === "templates"
    );
    const rawUrlGetter = templates?.admin?.livePreview?.url;
    expect(rawUrlGetter).toBeTypeOf("function");

    if (typeof rawUrlGetter !== "function") {
      throw new TypeError("Templates admin livePreview url is not a function");
    }
    // SAFETY: Live preview url getter matches LivePreviewUrlFunction contract in tests.
    const urlGetter = rawUrlGetter as LivePreviewUrlFunction;
    const mockPayload = {
      findByID: () => Promise.resolve({ id: 10, slug: "toko-kopi" }),
    };
    const mockReq = createMockRequest({ payload: mockPayload });

    const homeUrl = await urlGetter({
      req: mockReq,
      data: {
        name: "Home Layout",
        type: "home",
        store: 10,
      },
    });
    expect(homeUrl).toBe(
      `/next/preview?path=%2Ftoko-kopi&previewSecret=${env.PREVIEW_SECRET}`
    );

    const productUrl = await urlGetter({
      req: mockReq,
      data: {
        name: "Product Layout",
        type: "product",
        store: 10,
      },
    });
    expect(productUrl).toBe(
      `/next/preview?path=%2Ftoko-kopi%2Fproducts&previewSecret=${env.PREVIEW_SECRET}`
    );

    const collectionUrl = await urlGetter({
      req: mockReq,
      data: {
        name: "Collection Layout",
        type: "collection",
        store: 10,
      },
    });
    expect(collectionUrl).toBe(
      `/next/preview?path=%2Ftoko-kopi%2Fcollections&previewSecret=${env.PREVIEW_SECRET}`
    );

    const pageUrl = await urlGetter({
      req: mockReq,
      data: {
        name: "Page Layout",
        type: "page",
        store: 10,
      },
    });
    expect(pageUrl).toBe(
      `/next/preview?path=%2Ftoko-kopi%3FtemplateType%3Dpage&previewSecret=${env.PREVIEW_SECRET}`
    );
  });
});
