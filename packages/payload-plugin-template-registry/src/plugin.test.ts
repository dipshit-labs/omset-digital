import { describe, expect, it } from "bun:test";
import {
  type TemplateManifest,
  TemplateTokenSchema,
} from "@repo/template-contract";
import type { Config, GroupField, SelectField } from "payload";
import { z } from "zod";
import { templateRegistryPlugin } from "./plugin";

const DUPLICATE_SLUG_REGEX = /Duplicate template slug detected: "default"/;
const EMPTY_SLUG_REGEX = /Template manifest must have a non-empty slug/;

const createMockManifest = (
  slug: string,
  label: string,
  settingsSchema?: z.ZodObject<z.ZodRawShape>
): TemplateManifest => ({
  slug,
  label,
  defaultSections: ["hero"],
  supportedSections: ["hero"],
  tokenSchema: TemplateTokenSchema,
  defaultTokens: {
    accent: "#000000",
    accentForeground: "#ffffff",
    background: "#ffffff",
    border: "#e2e8f0",
    borderRadius: "md",
    card: "#ffffff",
    cardForeground: "#000000",
    containerWidth: "normal",
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",
    foreground: "#000000",
    input: "#e2e8f0",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    popover: "#ffffff",
    popoverForeground: "#000000",
    primary: "#0f172a",
    primaryForeground: "#ffffff",
    ring: "#0f172a",
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",
  },
  settingsSchema,
});

const defaultSettingsSchema = z.object({
  heroLayout: z.enum(["centered", "split"]).default("centered"),
  showTicker: z.boolean().default(false),
});

const minimalSettingsSchema = z.object({
  showBanner: z.boolean().default(true),
});

const defaultManifest = createMockManifest(
  "default",
  "Default Template",
  defaultSettingsSchema
);

const minimalManifest = createMockManifest(
  "minimal",
  "Minimal Template",
  minimalSettingsSchema
);

const bareManifest = createMockManifest("bare", "Bare Template");

const createBaseConfig = (): Config =>
  ({
    collections: [
      {
        slug: "tenants",
        admin: {
          defaultColumns: ["name", "slug", "customDomain", "theme"],
        },
        fields: [
          { name: "name", required: true, type: "text" },
          { name: "slug", required: true, type: "text" },
          { name: "customDomain", type: "text" },
          {
            name: "theme",
            options: ["default", "minimal"],
            type: "select",
          },
          { name: "themeConfig", type: "json" },
        ],
      },
      {
        fields: [{ name: "title", type: "text" }],
        slug: "products",
      },
    ],
  }) as Config;

describe("templateRegistryPlugin", () => {
  describe("manifest validation", () => {
    it("validates slug uniqueness across registered manifests", () => {
      const duplicate1 = createMockManifest("default", "Default 1");
      const duplicate2 = createMockManifest("default", "Default 2");

      const plugin = templateRegistryPlugin({
        manifests: [duplicate1, duplicate2],
      });

      expect(() => {
        plugin(createBaseConfig());
      }).toThrow(DUPLICATE_SLUG_REGEX);
    });

    it("throws if manifest slug is missing or empty", () => {
      const invalidManifest = createMockManifest("", "Empty Slug");

      const plugin = templateRegistryPlugin({
        manifests: [invalidManifest],
      });

      expect(() => {
        plugin(createBaseConfig());
      }).toThrow(EMPTY_SLUG_REGEX);
    });
  });

  describe("activeTemplate selector injection", () => {
    it("injects activeTemplate select field with options matching registered manifests", () => {
      const plugin = templateRegistryPlugin({
        manifests: [defaultManifest, minimalManifest, bareManifest],
      });

      const config = plugin(createBaseConfig());
      const tenantsCollection = config.collections?.find(
        (c) => c.slug === "tenants"
      );
      expect(tenantsCollection).toBeDefined();

      const activeTemplateField = tenantsCollection?.fields.find(
        (f) => "name" in f && f.name === "activeTemplate"
      ) as SelectField | undefined;

      expect(activeTemplateField).toBeDefined();
      expect(activeTemplateField?.type).toBe("select");
      expect(activeTemplateField?.required).toBe(true);
      expect(activeTemplateField?.defaultValue).toBe("default");
      expect(activeTemplateField?.options).toEqual([
        { label: "Default Template", value: "default" },
        { label: "Minimal Template", value: "minimal" },
        { label: "Bare Template", value: "bare" },
      ]);
    });

    it("replaces legacy theme field in defaultColumns with activeTemplate", () => {
      const plugin = templateRegistryPlugin({
        manifests: [defaultManifest],
      });

      const config = plugin(createBaseConfig());
      const tenantsCollection = config.collections?.find(
        (c) => c.slug === "tenants"
      );

      expect(tenantsCollection?.admin?.defaultColumns).toEqual([
        "name",
        "slug",
        "customDomain",
        "activeTemplate",
      ]);
    });
  });

  describe("templateTokens group injection", () => {
    it("injects base template tokens group accepting valid tokens and rejecting invalid types", () => {
      const plugin = templateRegistryPlugin({
        manifests: [defaultManifest],
      });

      const config = plugin(createBaseConfig());
      const tenantsCollection = config.collections?.find(
        (c) => c.slug === "tenants"
      );

      const templateTokensField = tenantsCollection?.fields.find(
        (f) => "name" in f && f.name === "templateTokens"
      ) as GroupField | undefined;

      expect(templateTokensField).toBeDefined();
      expect(templateTokensField?.type).toBe("group");

      const accentField = templateTokensField?.fields.find(
        (f) => "name" in f && f.name === "accent"
      );
      expect(accentField).toBeDefined();
      expect(accentField?.type).toBe("text");
      expect(
        Boolean(
          accentField && "required" in accentField && accentField.required
        )
      ).toBe(false);

      if (
        accentField &&
        "validate" in accentField &&
        typeof accentField.validate === "function"
      ) {
        expect(accentField.validate("#123456", {} as never)).toBe(true);
        expect(accentField.validate(undefined, {} as never)).toBe(true);
        expect(accentField.validate("", {} as never)).toBe(true);
        expect(typeof accentField.validate("invalid-hex", {} as never)).toBe(
          "string"
        );
      }

      const borderRadiusField = templateTokensField?.fields.find(
        (f) => "name" in f && f.name === "borderRadius"
      );
      expect(borderRadiusField).toBeDefined();
      expect(borderRadiusField?.type).toBe("select");
      if (
        borderRadiusField &&
        "validate" in borderRadiusField &&
        typeof borderRadiusField.validate === "function"
      ) {
        expect(borderRadiusField.validate("lg", {} as never)).toBe(true);
        expect(
          typeof borderRadiusField.validate("extra-huge", {} as never)
        ).toBe("string");
      }
    });
  });

  describe("templateConfig namespaced group injection", () => {
    it("injects namespaced groups conditioned on activeTemplate", () => {
      const plugin = templateRegistryPlugin({
        manifests: [defaultManifest, minimalManifest, bareManifest],
      });

      const config = plugin(createBaseConfig());
      const tenantsCollection = config.collections?.find(
        (c) => c.slug === "tenants"
      );

      const templateConfigField = tenantsCollection?.fields.find(
        (f) => "name" in f && f.name === "templateConfig"
      ) as GroupField | undefined;

      expect(templateConfigField).toBeDefined();
      expect(templateConfigField?.type).toBe("group");

      // bareManifest has no settingsSchema, so only default and minimal sub-groups exist
      expect(templateConfigField?.fields).toHaveLength(2);

      const defaultGroup = templateConfigField?.fields.find(
        (f) => "name" in f && f.name === "default"
      ) as GroupField | undefined;

      const minimalGroup = templateConfigField?.fields.find(
        (f) => "name" in f && f.name === "minimal"
      ) as GroupField | undefined;

      expect(defaultGroup).toBeDefined();
      expect(minimalGroup).toBeDefined();

      const defaultCondition = defaultGroup?.admin?.condition;
      expect(typeof defaultCondition).toBe("function");

      const minimalCondition = minimalGroup?.admin?.condition;
      expect(typeof minimalCondition).toBe("function");

      // When activeTemplate is "default"
      expect(
        defaultCondition?.(
          { activeTemplate: "default" },
          { activeTemplate: "default" },
          {} as never
        )
      ).toBe(true);
      expect(
        minimalCondition?.(
          { activeTemplate: "default" },
          { activeTemplate: "default" },
          {} as never
        )
      ).toBe(false);

      // When activeTemplate is "minimal"
      expect(
        defaultCondition?.(
          { activeTemplate: "minimal" },
          { activeTemplate: "minimal" },
          {} as never
        )
      ).toBe(false);
      expect(
        minimalCondition?.(
          { activeTemplate: "minimal" },
          { activeTemplate: "minimal" },
          {} as never
        )
      ).toBe(true);
    });

    it("preserves inactive template configuration namespaces in the document structure", () => {
      const plugin = templateRegistryPlugin({
        manifests: [defaultManifest, minimalManifest],
      });

      const config = plugin(createBaseConfig());
      const tenantsCollection = config.collections?.find(
        (c) => c.slug === "tenants"
      );

      const templateConfigField = tenantsCollection?.fields.find(
        (f) => "name" in f && f.name === "templateConfig"
      ) as GroupField | undefined;

      const subGroupNames =
        templateConfigField?.fields.map((f) => ("name" in f ? f.name : null)) ??
        [];
      expect(subGroupNames).toContain("default");
      expect(subGroupNames).toContain("minimal");

      const docData = {
        activeTemplate: "minimal",
        templateConfig: {
          default: { heroLayout: "split", showTicker: true },
          minimal: { showBanner: false },
        },
      };

      const defaultGroup = templateConfigField?.fields.find(
        (f) => "name" in f && f.name === "default"
      ) as GroupField | undefined;
      const minimalGroup = templateConfigField?.fields.find(
        (f) => "name" in f && f.name === "minimal"
      ) as GroupField | undefined;

      expect(
        defaultGroup?.admin?.condition?.(docData, docData, {} as never)
      ).toBe(false);
      expect(
        minimalGroup?.admin?.condition?.(docData, docData, {} as never)
      ).toBe(true);
      expect(docData.templateConfig.default.heroLayout).toBe("split");
      expect(docData.templateConfig.minimal.showBanner).toBe(false);
    });
  });

  describe("removes legacy theme fields", () => {
    it("strips legacy theme and themeConfig fields from tenants collection", () => {
      const plugin = templateRegistryPlugin({
        manifests: [defaultManifest],
      });

      const config = plugin(createBaseConfig());
      const tenantsCollection = config.collections?.find(
        (c) => c.slug === "tenants"
      );

      const fieldNames =
        tenantsCollection?.fields.map((f) => ("name" in f ? f.name : null)) ??
        [];
      expect(fieldNames).not.toContain("theme");
      expect(fieldNames).not.toContain("themeConfig");
      expect(fieldNames).toContain("activeTemplate");
      expect(fieldNames).toContain("templateTokens");
      expect(fieldNames).toContain("templateConfig");
    });
  });
});
