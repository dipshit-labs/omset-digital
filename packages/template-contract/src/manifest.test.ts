import { describe, expect, it } from "bun:test";
import { z } from "zod";
import type {
  SectionProps,
  SectionRegistry,
  TemplateManifest,
  TemplatePackage,
} from "./index";
import { TemplateTokenSchema, type TemplateTokens } from "./tokens";

describe("TemplateManifest and TemplatePackage contracts", () => {
  const sampleTokens: TemplateTokens = {
    accent: "#f1f5f9",
    accentForeground: "#0f172a",
    background: "#ffffff",
    border: "#e2e8f0",
    borderRadius: "md",
    card: "#ffffff",
    cardForeground: "#09090b",
    containerWidth: "normal",
    destructive: "#ef4444",
    destructiveForeground: "#f8fafc",
    foreground: "#09090b",
    input: "#e2e8f0",
    muted: "#f8fafc",
    mutedForeground: "#64748b",
    popover: "#ffffff",
    popoverForeground: "#09090b",
    primary: "#0f172a",
    primaryForeground: "#ffffff",
    ring: "#0f172a",
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",
  };

  it("validates manifest structure with custom settings", () => {
    const dummySettingsSchema = z.object({
      heroLayout: z.enum(["split", "centered"]),
    });

    const mockManifest: TemplateManifest<z.infer<typeof dummySettingsSchema>> =
      {
        defaultSections: ["hero", "product-grid"],
        defaultTokens: sampleTokens,
        label: "Test Template",
        settingsSchema: dummySettingsSchema,
        slug: "test-template",
        supportedSections: ["hero", "product-grid", "custom-section"],
        tokenSchema: TemplateTokenSchema,
        defaultSettings: {
          heroLayout: "split",
        },
      };

    expect(mockManifest.slug).toBe("test-template");
    expect(mockManifest.supportedSections).toContain("custom-section");
    expect(
      mockManifest.tokenSchema.parse(mockManifest.defaultTokens)
    ).toBeDefined();
  });

  it("satisfies TemplatePackage interface", () => {
    const mockRegistry: SectionRegistry = {
      hero: (_props: SectionProps) => null,
      "product-grid": (_props: SectionProps) => null,
    };

    const mockPackage: TemplatePackage = {
      registry: mockRegistry,
      manifest: {
        defaultSections: ["hero"],
        defaultTokens: sampleTokens,
        label: "Dummy",
        slug: "dummy",
        supportedSections: ["hero"],
        tokenSchema: TemplateTokenSchema,
      },
      tokensToCssVars: (tokens: TemplateTokens) => ({
        "--primary": tokens.primary,
      }),
    };

    expect(mockPackage.manifest.slug).toBe("dummy");
    expect(typeof mockPackage.tokensToCssVars).toBe("function");
    expect(
      mockPackage.tokensToCssVars(mockPackage.manifest.defaultTokens)[
        "--primary"
      ]
    ).toBe("#0f172a");
  });
});
