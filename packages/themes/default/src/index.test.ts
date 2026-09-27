import { evaluateThemeCssVars } from "@repo/payload-plugin-themes/types";
import { THEME_CSS_VARIABLE_KEYS, THEME_CSS_VARIABLES } from "@repo/ui/tokens";
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

  it("declares declarative cssVar mappings on branding settings", () => {
    const primaryField = defaultTheme.settings?.find(
      (s) => s.name === "primaryColor"
    );
    expect(primaryField?.cssVar).toBe(THEME_CSS_VARIABLES.primary);

    const fontHeadingField = defaultTheme.settings?.find(
      (s) => s.name === "fontHeading"
    );
    const defaultValue =
      fontHeadingField && "defaultValue" in fontHeadingField
        ? fontHeadingField.defaultValue
        : undefined;
    expect(defaultValue).toBe("var(--font-plus-jakarta-sans)");
  });

  it("evaluates default theme CSS variables via plugin evaluator", () => {
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
      "--accent": "#445566",
      "--background": "#ffffff",
      "--font-template-body": "var(--font-roboto)",
      "--font-template-heading": "var(--font-outfit)",
      "--foreground": "#000000",
      "--primary": "#112233",
    });
    const keys = Object.keys(vars);
    expect(keys.toSorted()).toStrictEqual(THEME_CSS_VARIABLE_KEYS.toSorted());
  });
});
