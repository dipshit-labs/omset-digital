import {
  evaluateThemeCssVars,
  MERCHANT_THEME_VARIABLES,
} from "@repo/theme-core";
import { describe, expect, it } from "vitest";

import { defaultTheme, heroSection, homePreset } from "./index";

describe("default-theme package", () => {
  it("declares theme manifest with global branding settings", () => {
    expect(defaultTheme).toMatchObject({
      name: "Default Theme",
      slug: "default",
      version: "1.0.0",
    });
    expect(defaultTheme.settings).toBeDefined();

    const settingNames = (defaultTheme.settings || []).map((s) => s.name);
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

  it("declares hero section definition with child blocks", () => {
    expect(heroSection.slug).toBe("hero");
    expect(heroSection.name).toBe("Hero");
    expect(heroSection.blocks).toBeDefined();
    expect(heroSection.blocks?.length).toBe(1);
    expect(heroSection.blocks?.[0].slug).toBe("bullet");
  });

  it("declares home template preset containing hero section", () => {
    expect(homePreset.name).toBe("Home");
    expect(homePreset.type).toBe("home");
    expect(homePreset.sections).toHaveLength(1);
    expect(homePreset.sections[0].blockType).toBe("hero");
    expect(homePreset.sections[0].blocks?.length).toBe(2);
  });

  it("declares color cssVar mappings on branding settings adhering to theme-core contract", () => {
    const primaryField = defaultTheme.settings?.find(
      (s) => s.name === "primaryColor"
    );
    expect(primaryField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.brand);

    const accentField = defaultTheme.settings?.find(
      (s) => s.name === "accentColor"
    );
    expect(accentField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.muted);

    const bgField = defaultTheme.settings?.find(
      (s) => s.name === "backgroundColor"
    );
    expect(bgField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.background);

    const textField = defaultTheme.settings?.find(
      (s) => s.name === "textColor"
    );
    expect(textField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.foreground);
  });

  it("declares typography cssVar mappings on branding settings adhering to theme-core contract", () => {
    const fontHeadingField = defaultTheme.settings?.find(
      (s) => s.name === "fontHeading"
    );
    expect(fontHeadingField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.fontHeading);
    const defaultValue =
      fontHeadingField && "defaultValue" in fontHeadingField
        ? fontHeadingField.defaultValue
        : undefined;
    expect(defaultValue).toBe("var(--font-plus-jakarta-sans)");

    const fontBodyField = defaultTheme.settings?.find(
      (s) => s.name === "fontBody"
    );
    expect(fontBodyField?.cssVar).toBe(MERCHANT_THEME_VARIABLES.fontBody);
  });

  it("evaluates default theme CSS variables via theme-core evaluator", () => {
    const vars = evaluateThemeCssVars({
      manifest: defaultTheme,
      settings: {
        accentColor: "#445566",
        backgroundColor: "#ffffff",
        fontBody: "var(--font-roboto)",
        fontHeading: "var(--font-outfit)",
        primaryColor: "#112233",
        textColor: "#000000",
      },
    });

    expect(vars).toMatchObject({
      "--theme-background": "#ffffff",
      "--theme-brand": "#112233",
      "--theme-font-body": "var(--font-roboto)",
      "--theme-font-heading": "var(--font-outfit)",
      "--theme-foreground": "#000000",
      "--theme-muted": "#445566",
    });
  });
});
