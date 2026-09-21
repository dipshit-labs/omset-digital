import { describe, expect, it } from "bun:test";
import { TemplateTokenSchema } from "@repo/template-contract";
import { template } from "./index";
import { manifest } from "./manifest";
import { registry } from "./sections/index";
import { tokensToCssVars } from "./tokens";

describe("Default Template - manifest & tokens", () => {
  it("manifest conforms to TemplateManifest contract and has valid defaultTokens", () => {
    expect(manifest.slug).toBe("default");
    expect(manifest.label).toBe("Default");
    expect(manifest.supportedSections).toEqual([
      "hero",
      "product-grid",
      "about",
      "testimonials",
      "contact",
      "blog-preview",
    ]);
    expect(manifest.defaultSections.length).toBeGreaterThan(0);

    const parsedTokens = TemplateTokenSchema.parse(manifest.defaultTokens);
    expect(parsedTokens).toEqual(manifest.defaultTokens);
  });

  it("tokensToCssVars maps every required shadcn variable to CSS custom properties", () => {
    const cssVars = tokensToCssVars(manifest.defaultTokens);

    // Assert every core shadcn token is present
    expect(cssVars["--primary"]).toBe(manifest.defaultTokens.primary);
    expect(cssVars["--primary-foreground"]).toBe(
      manifest.defaultTokens.primaryForeground
    );
    expect(cssVars["--secondary"]).toBe(manifest.defaultTokens.secondary);
    expect(cssVars["--secondary-foreground"]).toBe(
      manifest.defaultTokens.secondaryForeground
    );
    expect(cssVars["--background"]).toBe(manifest.defaultTokens.background);
    expect(cssVars["--foreground"]).toBe(manifest.defaultTokens.foreground);
    expect(cssVars["--card"]).toBe(manifest.defaultTokens.card);
    expect(cssVars["--card-foreground"]).toBe(
      manifest.defaultTokens.cardForeground
    );
    expect(cssVars["--popover"]).toBe(manifest.defaultTokens.popover);
    expect(cssVars["--popover-foreground"]).toBe(
      manifest.defaultTokens.popoverForeground
    );
    expect(cssVars["--muted"]).toBe(manifest.defaultTokens.muted);
    expect(cssVars["--muted-foreground"]).toBe(
      manifest.defaultTokens.mutedForeground
    );
    expect(cssVars["--accent"]).toBe(manifest.defaultTokens.accent);
    expect(cssVars["--accent-foreground"]).toBe(
      manifest.defaultTokens.accentForeground
    );
    expect(cssVars["--destructive"]).toBe(manifest.defaultTokens.destructive);
    expect(cssVars["--destructive-foreground"]).toBe(
      manifest.defaultTokens.destructiveForeground
    );
    expect(cssVars["--border"]).toBe(manifest.defaultTokens.border);
    expect(cssVars["--input"]).toBe(manifest.defaultTokens.input);
    expect(cssVars["--ring"]).toBe(manifest.defaultTokens.ring);
    expect(cssVars["--radius"]).toBeDefined();

    // Assert layout & font variables
    expect(cssVars["--container-width"]).toBeDefined();
    expect(cssVars["--font-heading"]).toBeDefined();
    expect(cssVars["--font-body"]).toBeDefined();
  });

  it("tokensToCssVars handles custom token overrides across all variables", () => {
    const customTokens = {
      ...manifest.defaultTokens,
      accent: "#f59e0b",
      accentForeground: "#000000",
      borderRadius: "lg" as const,
      containerWidth: "wide" as const,
      primary: "#1e3a8a",
      primaryForeground: "#ffffff",
    };

    const cssVars = tokensToCssVars(customTokens);
    expect(cssVars["--primary"]).toBe("#1e3a8a");
    expect(cssVars["--accent"]).toBe("#f59e0b");
    expect(cssVars["--accent-foreground"]).toBe("#000000");
    expect(cssVars["--radius"]).toBe("0.75rem");
    expect(cssVars["--container-width"]).toBe("80rem");
  });

  it("exports a complete TemplatePackage with section components registered for every supported section", () => {
    expect(template.manifest).toBe(manifest);
    expect(template.registry).toBe(registry);
    expect(template.tokensToCssVars).toBe(tokensToCssVars);

    for (const sectionType of manifest.supportedSections) {
      expect(template.registry[sectionType]).toBeDefined();
      expect(typeof template.registry[sectionType]).toBe("function");
    }
  });
});
