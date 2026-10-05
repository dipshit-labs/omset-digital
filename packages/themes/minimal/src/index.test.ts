import { describe, expect, it } from "vitest";

import {
  evaluateThemeCssVars,
  MERCHANT_THEME_VARIABLES,
} from "@repo/theme-core";
import { heroSection, homePreset, minimalTheme } from "./index";

describe("minimal-theme package", () => {
  it("declares theme manifest with global branding settings", () => {
    expect(minimalTheme).toMatchObject({
      name: "Minimal Theme",
      slug: "minimal",
      version: "1.0.0",
    });
    expect(minimalTheme.settings).toBeDefined();

    const settingNames = (minimalTheme.settings || []).map((s) => s.name);
    expect(settingNames).toStrictEqual(
      expect.arrayContaining([
        "primaryColor",
        "accentColor",
        "backgroundColor",
        "textColor",
        "fontHeading",
        "fontBody",
      ])
    );
  });

  it("declares hero section definition with child tag blocks", () => {
    expect(heroSection.slug).toBe("hero");
    expect(heroSection.name).toBe("Minimal Hero");
    expect(heroSection.blocks).toBeDefined();
    expect(heroSection.blocks?.length).toBe(1);
    expect(heroSection.blocks?.[0].slug).toBe("tag");
  });

  it("declares home template preset containing hero section", () => {
    expect(homePreset.name).toBe("Home");
    expect(homePreset.type).toBe("home");
    expect(homePreset.sections).toHaveLength(1);
    expect(homePreset.sections[0].blockType).toBe("hero");
    expect(homePreset.sections[0].blocks?.length).toBe(2);
  });

  it("declares color cssVar mappings on branding settings adhering to theme-core contract", () => {
    const primaryField = minimalTheme.settings?.find(
      (s) => s.name === "primaryColor"
    );
    expect(primaryField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.brand);

    const accentField = minimalTheme.settings?.find(
      (s) => s.name === "accentColor"
    );
    expect(accentField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.muted);

    const bgField = minimalTheme.settings?.find(
      (s) => s.name === "backgroundColor"
    );
    expect(bgField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.background);

    const textField = minimalTheme.settings?.find(
      (s) => s.name === "textColor"
    );
    expect(textField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.foreground);
  });

  it("declares typography cssVar mappings on branding settings adhering to theme-core contract", () => {
    const fontHeadingField = minimalTheme.settings?.find(
      (s) => s.name === "fontHeading"
    );
    expect(fontHeadingField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.fontHeading);

    const fontBodyField = minimalTheme.settings?.find(
      (s) => s.name === "fontBody"
    );
    expect(fontBodyField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.fontBody);
  });

  it("evaluates minimal theme CSS variables via theme-core evaluator", () => {
    const vars = evaluateThemeCssVars({
      manifest: minimalTheme,
      settings: {
        accentColor: "#71717a",
        backgroundColor: "#fafafa",
        fontBody: "var(--font-inter)",
        fontHeading: "var(--font-inter)",
        primaryColor: "#18181b",
        textColor: "#18181b",
      },
    });

    expect(vars).toMatchObject({
      "--theme-background": "#fafafa",
      "--theme-brand": "#18181b",
      "--theme-font-body": "var(--font-inter)",
      "--theme-font-heading": "var(--font-inter)",
      "--theme-foreground": "#18181b",
      "--theme-muted": "#71717a",
    });
  });
});
