import { describe, expect, it } from "vitest";

import type { SettingField } from "../types";
import {
  evaluateFieldCssValue,
  evaluateThemeCssVars,
} from "./evaluateThemeCssVars";

describe(evaluateFieldCssValue, () => {
  it("formats number values with unit", () => {
    const field: SettingField = {
      label: "Radius",
      name: "radius",
      type: "number",
      unit: "px",
    };
    expect(evaluateFieldCssValue(field, 12)).toBe("12px");
  });

  it("returns null for empty or nullish values", () => {
    const field: SettingField = {
      label: "Color",
      name: "color",
      type: "color",
    };
    expect(evaluateFieldCssValue(field, null)).toBeNull();
    expect(evaluateFieldCssValue(field, "")).toBeNull();
  });
});

describe(evaluateThemeCssVars, () => {
  it("evaluates declarative cssVar mappings from settings", () => {
    const manifest = {
      settings: [
        {
          cssVar: "--primary",
          defaultValue: "#000000",
          label: "Primary",
          name: "primaryColor",
          type: "color" as const,
        },
        {
          cssVar: "--font-template-body",
          defaultValue: "var(--font-inter)",
          label: "Body Font",
          name: "fontBody",
          type: "select" as const,
          options: [
            { label: "Inter", value: "var(--font-inter)" },
            { label: "Roboto", value: "var(--font-roboto)" },
          ],
        },
        {
          cssVar: "--radius",
          defaultValue: 8,
          label: "Radius",
          name: "radius",
          type: "number" as const,
          unit: "px",
        },
      ],
    };

    const vars = evaluateThemeCssVars({
      manifest,
      baseTokens: {
        "--accent": "#3b82f6",
        "--primary": "#111111",
      },
      settings: {
        fontBody: "var(--font-roboto)",
        primaryColor: "#ff0000",
      },
    });

    expect(vars["--primary"]).toBe("#ff0000");
    expect(vars["--accent"]).toBe("#3b82f6");
    expect(vars["--font-template-body"]).toBe("var(--font-roboto)");
    expect(vars["--radius"]).toBe("8px");
  });

  it("falls back to default values when setting values are absent", () => {
    const manifest = {
      settings: [
        {
          cssVar: "--bg",
          defaultValue: "#ffffff",
          label: "Background",
          name: "bgColor",
          type: "color" as const,
        },
      ],
    };

    const vars = evaluateThemeCssVars({
      manifest,
      settings: {},
    });

    expect(vars["--bg"]).toBe("#ffffff");
  });
});
