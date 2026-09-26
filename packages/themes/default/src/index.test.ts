import { THEME_CSS_VARIABLE_KEYS } from "@repo/ui/tokens";
import { describe, expect, it } from "vitest";

import { cssVars, defaultTheme, heroSection, homePreset } from "./index";

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

  it("cssVars maps theme settings to @repo/ui CSS variables", () => {
    const vars = cssVars({
      accentColor: "#445566",
      backgroundColor: "#ffffff",
      fontBody: "roboto",
      fontHeading: "outfit",
      primaryColor: "#112233",
      textColor: "#000000",
    });
    expect(vars).toStrictEqual({
      "--accent": "#445566",
      "--background": "#ffffff",
      "--font-template-body": "roboto",
      "--font-template-heading": "outfit",
      "--foreground": "#000000",
      "--primary": "#112233",
    });
  });

  it("cssVars outputs valid @repo/ui CSS variable properties", () => {
    const vars = cssVars({});
    const keys = Object.keys(vars);
    expect(keys.toSorted()).toStrictEqual(THEME_CSS_VARIABLE_KEYS.toSorted());
  });
});
