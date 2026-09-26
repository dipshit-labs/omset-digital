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

  it("cssVars maps theme settings to CSS variables", () => {
    const vars = cssVars({
      accentColor: "#445566",
      backgroundColor: "#ffffff",
      fontBody: "roboto",
      fontHeading: "outfit",
      primaryColor: "#112233",
      textColor: "#000000",
    });
    expect(vars).toStrictEqual({
      "--color-accent": "#445566",
      "--color-background": "#ffffff",
      "--color-primary": "#112233",
      "--color-text": "#000000",
      "--font-body": "roboto",
      "--font-heading": "outfit",
    });
  });
});
