import { describe, expect, it } from "vitest";

import {
  calculateDerivedRadii,
  DEFAULT_MERCHANT_TOKENS,
  FIXED_THEME_TOKENS,
  MERCHANT_THEME_VARIABLES,
} from "../tokens";
import type { SettingField, ThemeManifestDefinition } from "../types";
import { getWcagContrast, parseOklch } from "./color";
import {
  evaluateFieldCssValue,
  evaluateThemeCssVars,
} from "./evaluateThemeCssVars";

describe(evaluateFieldCssValue, () => {
  it("formats number values with attached unit", () => {
    const field: SettingField = {
      label: "Corner Radius",
      name: "radius",
      type: "number",
      unit: "px",
    };
    expect(evaluateFieldCssValue(field, 8)).toBe("8px");
  });

  it("converts boolean and string values to strings", () => {
    const textField: SettingField = {
      label: "Heading Font",
      name: "fontHeading",
      type: "text",
    };
    expect(evaluateFieldCssValue(textField, "Inter")).toBe("Inter");

    const toggleField: SettingField = {
      label: "Show Banner",
      name: "showBanner",
      type: "toggle",
    };
    expect(evaluateFieldCssValue(toggleField, true)).toBe("true");
  });

  it("returns null for empty, null, or undefined values", () => {
    const field: SettingField = {
      label: "Background",
      name: "bg",
      type: "color",
    };
    expect(evaluateFieldCssValue(field, null)).toBeNull();
    expect(evaluateFieldCssValue(field)).toBeNull();
    expect(evaluateFieldCssValue(field, "")).toBeNull();
  });
});

describe(evaluateThemeCssVars, () => {
  it("defaults to full tiered tokens contract when no settings or overrides provided", () => {
    const vars = evaluateThemeCssVars({});

    expect(vars[MERCHANT_THEME_VARIABLES.background]).toBe(
      DEFAULT_MERCHANT_TOKENS["--theme-background"]
    );
    expect(vars[MERCHANT_THEME_VARIABLES.brand]).toBe(
      DEFAULT_MERCHANT_TOKENS["--theme-brand"]
    );
    expect(vars[MERCHANT_THEME_VARIABLES.radius]).toBe(
      DEFAULT_MERCHANT_TOKENS["--theme-radius"]
    );
    expect(vars["--theme-success"]).toBe(FIXED_THEME_TOKENS["--theme-success"]);
    expect(vars["--theme-radius-sm"]).toBe(
      FIXED_THEME_TOKENS["--theme-radius-sm"]
    );
  });

  it("evaluates declarative cssVar bindings from theme settings", () => {
    const manifest: Pick<ThemeManifestDefinition, "settings"> = {
      settings: [
        {
          cssVar: "--theme-background",
          defaultValue: "#ffffff",
          label: "Page Background",
          name: "background",
          type: "color",
        },
        {
          cssVar: "--theme-brand",
          defaultValue: "#0f172a",
          label: "Brand Color",
          name: "brandColor",
          type: "color",
        },
        {
          cssVar: "--theme-radius",
          defaultValue: 4,
          label: "Border Radius",
          name: "borderRadius",
          type: "number",
          unit: "px",
        },
      ],
    };

    const vars = evaluateThemeCssVars({
      manifest,
      settings: {
        background: "#000000",
        borderRadius: 16,
        brandColor: "#6366f1",
      },
    });

    expect(vars["--theme-background"]).toBe("#000000");
    expect(vars["--theme-brand"]).toBe("oklch(0.585 0.204 277.117)");
    expect(vars["--theme-radius"]).toBe("16px");
    expect(vars["--theme-success"]).toBe(FIXED_THEME_TOKENS["--theme-success"]);
  });

  it("falls back to field defaultValue when setting value is undefined or empty", () => {
    const manifest: Pick<ThemeManifestDefinition, "settings"> = {
      settings: [
        {
          cssVar: "--theme-background",
          defaultValue: "#f8fafc",
          label: "Page Background",
          name: "background",
          type: "color",
        },
        {
          cssVar: "--theme-radius",
          defaultValue: 12,
          label: "Radius",
          name: "radius",
          type: "number",
          unit: "px",
        },
      ],
    };

    const vars = evaluateThemeCssVars({
      manifest,
      settings: {
        background: "",
        radius: undefined,
      },
    });

    expect(vars["--theme-background"]).toBe("#f8fafc");
    expect(vars["--theme-radius"]).toBe("12px");
  });

  it("preserves base token fallback when neither setting value nor defaultValue is present", () => {
    const manifest: Pick<ThemeManifestDefinition, "settings"> = {
      settings: [
        {
          cssVar: "--theme-border",
          label: "Border Color",
          name: "border",
          type: "color",
        },
      ],
    };

    const vars = evaluateThemeCssVars({
      manifest,
      settings: {},
      baseTokens: {
        "--theme-border": "#e2e8f0",
      },
    });

    expect(vars["--theme-border"]).toBe("#e2e8f0");
  });

  it("derives dark navy foreground (#0f172a) for electric yellow (#facc15) with WCAG contrast >= 4.5:1", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "#facc15",
      },
    });

    expect(vars["--theme-brand-foreground"]).toBe("#0f172a");
    const contrast = getWcagContrast(
      vars["--theme-brand"],
      vars["--theme-brand-foreground"]
    );
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(contrast).toBeGreaterThanOrEqual(11);
  });

  it("derives white foreground (#ffffff) for dark navy (#0f172a) with WCAG contrast >= 4.5:1", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "#0f172a",
      },
    });

    expect(vars["--theme-brand-foreground"]).toBe("#ffffff");
    const contrast = getWcagContrast(
      vars["--theme-brand"],
      vars["--theme-brand-foreground"]
    );
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(contrast).toBeGreaterThanOrEqual(17);
  });

  it("evaluates brand hover token with a 0.06 lightness delta from primary brand color in light mode", () => {
    const vars = evaluateThemeCssVars({
      mode: "light",
      settings: {
        brand: "#facc15",
      },
    });

    const parsedBrand = parseOklch(vars["--theme-brand"]);
    const parsedHover = parseOklch(vars["--theme-brand-hover"]);

    expect(parsedBrand).toBeDefined();
    expect(parsedHover).toBeDefined();
    expect((parsedBrand?.l ?? 0) - (parsedHover?.l ?? 0)).toBeCloseTo(0.06, 3);
  });

  it("evaluates brand hover token with a 0.06 lightness delta from primary brand color in dark mode", () => {
    const vars = evaluateThemeCssVars({
      mode: "dark",
      settings: {
        brand: "#0f172a",
      },
    });

    const parsedBrand = parseOklch(vars["--theme-brand"]);
    const parsedHover = parseOklch(vars["--theme-brand-hover"]);

    expect(parsedBrand).toBeDefined();
    expect(parsedHover).toBeDefined();
    expect((parsedHover?.l ?? 0) - (parsedBrand?.l ?? 0)).toBeCloseTo(0.06, 3);
  });

  it("evaluates subtle brand background with matching hue", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "#facc15",
      },
    });

    const parsedBrand = parseOklch(vars["--theme-brand"]);
    const parsedSubtle = parseOklch(vars["--theme-brand-subtle"]);

    expect(parsedSubtle?.l).toBeCloseTo(0.965, 3);
    expect(parsedSubtle?.c).toBeCloseTo(0.025, 3);
    expect(parsedSubtle?.h).toBeCloseTo(parsedBrand?.h ?? 0, 1);
  });

  it("evaluates subtle brand foreground with matching hue and accessible contrast", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "#facc15",
      },
    });

    const parsedBrand = parseOklch(vars["--theme-brand"]);
    const parsedSubtleFg = parseOklch(vars["--theme-brand-subtle-foreground"]);

    expect(parsedSubtleFg?.l).toBeCloseTo(0.38, 3);
    expect(parsedSubtleFg?.h).toBeCloseTo(parsedBrand?.h ?? 0, 1);

    const contrast = getWcagContrast(
      vars["--theme-brand-subtle"],
      vars["--theme-brand-subtle-foreground"]
    );
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("formats evaluated color variables as valid CSS oklch(...) strings", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "#facc15",
      },
    });

    expect(vars["--theme-brand"]).toMatch(/^oklch\(/u);
    expect(vars["--theme-brand-hover"]).toMatch(/^oklch\(/u);
    expect(vars["--theme-brand-subtle"]).toMatch(/^oklch\(/u);
    expect(vars["--theme-brand-subtle-foreground"]).toMatch(/^oklch\(/u);
  });

  it("respects explicit merchant brandForeground override", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "#facc15",
        brandForeground: "#123456",
      },
    });

    expect(vars["--theme-brand-foreground"]).toBe("#123456");
  });

  it("handles wide-gamut OKLCH brand input with valid sRGB fallback", () => {
    const vars = evaluateThemeCssVars({
      settings: {
        brand: "oklch(0.65 0.32 310)",
      },
    });

    expect(vars["--theme-brand-srgb"]).toMatch(/^#[0-9a-f]{6}$/iu);
    expect(vars["--theme-brand"]).toMatch(/^oklch\(/u);
  });
});

describe(calculateDerivedRadii, () => {
  it("calculates derived radii with default var reference", () => {
    const derived = calculateDerivedRadii();

    expect(derived["--theme-radius-sm"]).toBe(
      "calc(var(--theme-radius) * 0.75)"
    );
    expect(derived["--theme-radius-md"]).toBe("var(--theme-radius)");
    expect(derived["--theme-radius-lg"]).toBe(
      "calc(var(--theme-radius) * 1.5)"
    );
    expect(derived["--theme-radius-full"]).toBe("9999px");
  });

  it("calculates derived radii from custom base radius value", () => {
    const derived = calculateDerivedRadii("12px");

    expect(derived["--theme-radius-sm"]).toBe("calc(12px * 0.75)");
    expect(derived["--theme-radius-md"]).toBe("12px");
    expect(derived["--theme-radius-lg"]).toBe("calc(12px * 1.5)");
    expect(derived["--theme-radius-full"]).toBe("9999px");
  });
});
