import { describe, expect, it } from "vitest";

import {
  deriveBrandRamp,
  deriveNeutralTokens,
  ensureSrgb,
  formatOklch,
  getAccessibleForeground,
  getWcagContrast,
  isWideGamut,
  parseOklch,
} from "./color";

describe("color utilities", () => {
  describe("getWcagContrast and getAccessibleForeground", () => {
    it("derives dark navy foreground for electric yellow with contrast >= 4.5:1", () => {
      const yellow = "#facc15";
      const fg = getAccessibleForeground(yellow);
      expect(fg).toBe("#0f172a");

      const contrast = getWcagContrast(yellow, fg);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      expect(contrast).toBeGreaterThanOrEqual(11);
    });

    it("derives white foreground for dark navy with contrast >= 4.5:1", () => {
      const navy = "#0f172a";
      const fg = getAccessibleForeground(navy);
      expect(fg).toBe("#ffffff");

      const contrast = getWcagContrast(navy, fg);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
      expect(contrast).toBeGreaterThanOrEqual(17);
    });

    it("respects custom dark and light options", () => {
      const fg = getAccessibleForeground("#facc15", "#111827", "#f9fafb");
      expect(fg).toBe("#111827");
    });
  });

  describe("isWideGamut and ensureSrgb", () => {
    it("identifies sRGB colors as not wide gamut", () => {
      expect(isWideGamut("#facc15")).toBeFalsy();
      expect(isWideGamut("#0f172a")).toBeFalsy();
      expect(isWideGamut("rgb(255, 0, 0)")).toBeFalsy();
    });

    it("identifies out-of-sRGB OKLCH and Display P3 colors as wide gamut", () => {
      expect(isWideGamut("oklch(0.65 0.32 310)")).toBeTruthy();
      expect(isWideGamut("color(display-p3 1 0 0)")).toBeTruthy();
    });

    it("reduces chroma via OKLCH binary search while preserving lightness and hue for wide-gamut OKLCH", () => {
      const wideColor = "oklch(0.65 0.32 310)";
      const fallbackHex = ensureSrgb(wideColor);

      expect(fallbackHex).toMatch(/^#[0-9a-f]{6}$/iu);
      expect(isWideGamut(fallbackHex)).toBeFalsy();

      const parsedFallback = parseOklch(fallbackHex);
      expect(parsedFallback).toBeDefined();
      const safeFallback = parsedFallback ?? { c: 1, h: 0, l: 0 };
      expect(safeFallback.l).toBeCloseTo(0.65, 1);
      expect(safeFallback.h).toBeCloseTo(310, 0);
    });

    it("reduces chroma below wide gamut bounds for fallback", () => {
      const wideColor = "oklch(0.65 0.32 310)";
      const fallbackHex = ensureSrgb(wideColor);
      const parsedFallback = parseOklch(fallbackHex);
      expect(parsedFallback?.c).toBeLessThan(0.32);
    });

    it("returns sRGB hex directly when color is already within sRGB gamut", () => {
      const hex = ensureSrgb("#facc15");
      expect(hex.toLowerCase()).toBe("#facc15");
    });
  });
  describe(formatOklch, () => {
    it("formats canonical oklch(L C H) strings", () => {
      expect(formatOklch({ c: 0.173, h: 91.936, l: 0.861 })).toBe(
        "oklch(0.861 0.173 91.936)"
      );
    });

    it("formats alpha when less than 1", () => {
      expect(formatOklch({ alpha: 0.5, c: 0.1, h: 100, l: 0.5 })).toBe(
        "oklch(0.500 0.100 100.000 / 0.500)"
      );
    });

    it("defaults undefined hue to 0 for achromatic colors", () => {
      expect(formatOklch({ c: 0, l: 0.5 })).toBe("oklch(0.500 0.000 0.000)");
    });
  });

  describe(deriveBrandRamp, () => {
    it("generates a complete brand ramp with valid OKLCH strings", () => {
      const ramp = deriveBrandRamp("#facc15");

      expect(ramp.brand).toMatch(/^oklch\(/u);
      expect(ramp.brandHover).toMatch(/^oklch\(/u);
      expect(ramp.brandSubtle).toMatch(/^oklch\(/u);
      expect(ramp.brandSubtleForeground).toMatch(/^oklch\(/u);
    });

    it("generates accessible foreground and sRGB fallback in brand ramp", () => {
      const ramp = deriveBrandRamp("#facc15");

      expect(ramp.brandForeground).toBe("#0f172a");
      expect(ramp.brandSrgb).toMatch(/^#[0-9a-f]{6}$/iu);
    });

    it("derives light mode hover token with 0.06 lightness delta from primary brand", () => {
      const ramp = deriveBrandRamp("#facc15", { mode: "light" });
      const parsedBrand = parseOklch(ramp.brand);
      const parsedHover = parseOklch(ramp.brandHover);

      expect(parsedBrand).toBeDefined();
      expect(parsedHover).toBeDefined();

      const delta = (parsedBrand?.l ?? 0) - (parsedHover?.l ?? 0);
      expect(delta).toBeCloseTo(0.06, 3);
    });

    it("derives dark mode hover token with +0.06 lightness delta from primary brand", () => {
      const ramp = deriveBrandRamp("#0f172a", { mode: "dark" });
      const parsedBrand = parseOklch(ramp.brand);
      const parsedHover = parseOklch(ramp.brandHover);

      expect(parsedBrand).toBeDefined();
      expect(parsedHover).toBeDefined();

      const delta = (parsedHover?.l ?? 0) - (parsedBrand?.l ?? 0);
      expect(delta).toBeCloseTo(0.06, 3);
    });

    it("derives subtle background token in light mode with matching hue", () => {
      const ramp = deriveBrandRamp("#facc15", { mode: "light" });
      const parsedBrand = parseOklch(ramp.brand);
      const parsedSubtle = parseOklch(ramp.brandSubtle);

      expect(parsedSubtle?.l).toBeCloseTo(0.965, 3);
      expect(parsedSubtle?.c).toBeCloseTo(0.025, 3);
      expect(parsedSubtle?.h).toBeCloseTo(parsedBrand?.h ?? 0, 1);
    });

    it("derives subtle foreground token in light mode with accessible contrast", () => {
      const ramp = deriveBrandRamp("#facc15", { mode: "light" });
      const parsedBrand = parseOklch(ramp.brand);
      const parsedSubtleFg = parseOklch(ramp.brandSubtleForeground);

      expect(parsedSubtleFg?.l).toBeCloseTo(0.38, 3);
      expect(parsedSubtleFg?.h).toBeCloseTo(parsedBrand?.h ?? 0, 1);

      const subtleContrast = getWcagContrast(
        ramp.brandSubtle,
        ramp.brandSubtleForeground
      );
      expect(subtleContrast).toBeGreaterThanOrEqual(4.5);
    });

    it("derives subtle background token in dark mode with matching hue", () => {
      const ramp = deriveBrandRamp("#0f172a", { mode: "dark" });
      const parsedBrand = parseOklch(ramp.brand);
      const parsedSubtle = parseOklch(ramp.brandSubtle);

      expect(parsedSubtle?.l).toBeCloseTo(0.2, 3);
      expect(parsedSubtle?.c).toBeCloseTo(0.04, 3);
      expect(parsedSubtle?.h).toBeCloseTo(parsedBrand?.h ?? 0, 1);
    });

    it("derives subtle foreground token in dark mode with accessible contrast", () => {
      const ramp = deriveBrandRamp("#0f172a", { mode: "dark" });
      const parsedBrand = parseOklch(ramp.brand);
      const parsedSubtleFg = parseOklch(ramp.brandSubtleForeground);

      expect(parsedSubtleFg?.l).toBeCloseTo(0.85, 3);
      expect(parsedSubtleFg?.c).toBeCloseTo(0.06, 3);
      expect(parsedSubtleFg?.h).toBeCloseTo(parsedBrand?.h ?? 0, 1);

      const subtleContrast = getWcagContrast(
        ramp.brandSubtle,
        ramp.brandSubtleForeground
      );
      expect(subtleContrast).toBeGreaterThanOrEqual(4.5);
    });

    it("handles wide-gamut OKLCH input by computing sRGB fallback", () => {
      const ramp = deriveBrandRamp("oklch(0.65 0.32 310)");
      expect(ramp.brandSrgb).toMatch(/^#[0-9a-f]{6}$/iu);
      expect(isWideGamut(ramp.brandSrgb)).toBeFalsy();
    });

    it("falls back gracefully when given invalid color input", () => {
      const ramp = deriveBrandRamp("not-a-color");
      expect(ramp.brand).toMatch(/^oklch\(/u);
      expect(ramp.brandForeground).toBe("#ffffff");
    });

    it("shifts primary brand to 300-400 range (L ~ 0.70 to 0.76) in dark mode to prevent chromatic aberration", () => {
      const darkRamp = deriveBrandRamp("#0f172a", { mode: "dark" });
      const parsedBrand = parseOklch(darkRamp.brand);
      expect(parsedBrand).toBeDefined();
      expect(parsedBrand?.l).toBeGreaterThanOrEqual(0.7);
      expect(parsedBrand?.l).toBeLessThanOrEqual(0.76);

      // Brand foreground should be dark on the shifted light brand
      expect(darkRamp.brandForeground).toBe("#0f172a");
    });
  });
});
describe(deriveNeutralTokens, () => {
  // Tailwind blue-500
  const brand = "#3b82f6";
  describe("light mode hierarchy", () => {
    it("evaluates base canvas to off-white tint with L ~ 0.985 and C <= 0.005", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "light" });
      const parsed = parseOklch(neutrals.background);
      expect(parsed).toBeDefined();
      expect(parsed?.l).toBeCloseTo(0.985, 3);
      expect(parsed?.c).toBeLessThanOrEqual(0.005);
    });

    it("evaluates subtle background to oklch(0.960 0.008 h)", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "light" });
      const parsed = parseOklch(neutrals.backgroundSubtle);
      const brandParsed = parseOklch(brand);
      expect(parsed).toBeDefined();
      expect(parsed?.l).toBeCloseTo(0.96, 3);
      expect(parsed?.c).toBeCloseTo(0.008, 3);
      expect(parsed?.h).toBeCloseTo(brandParsed?.h ?? 0, 1);
    });

    it("evaluates card surface and elevated surface to pure white #ffffff", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "light" });
      expect(neutrals.surface).toBe("#ffffff");
      expect(neutrals.surfaceElevated).toBe("#ffffff");
    });

    it("evaluates stroke layers in light mode", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "light" });
      const border = parseOklch(neutrals.border);
      const borderStrong = parseOklch(neutrals.borderStrong);

      expect(border?.l).toBeCloseTo(0.91, 3);
      expect(border?.c).toBeCloseTo(0.008, 3);

      expect(borderStrong?.l).toBeCloseTo(0.75, 3);
      expect(borderStrong?.c).toBeCloseTo(0.015, 3);
    });

    it("evaluates heading and body text variants in light mode", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "light" });
      const heading = parseOklch(neutrals.foreground);
      const body = parseOklch(neutrals.foregroundBody);

      expect(heading?.l).toBeCloseTo(0.18, 3);
      expect(heading?.c).toBeCloseTo(0.015, 3);
      expect(body?.l).toBeCloseTo(0.3, 3);
      expect(body?.c).toBeCloseTo(0.015, 3);
    });

    it("evaluates muted text variant in light mode", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "light" });
      const muted = parseOklch(neutrals.mutedForeground);

      expect(muted?.l).toBeCloseTo(0.55, 3);
      expect(muted?.c).toBeCloseTo(0.015, 3);
    });

    it("constrains neutral chroma to 0 for achromatic brand colors", () => {
      const neutrals = deriveNeutralTokens("#000000", { mode: "light" });
      const bg = parseOklch(neutrals.background);
      const border = parseOklch(neutrals.border);

      expect(bg?.c).toBe(0);
      expect(border?.c).toBe(0);
    });

    it("caps neutral chroma to brand chroma when brand chroma is below cap", () => {
      const neutrals = deriveNeutralTokens("oklch(0.5 0.002 180)", {
        mode: "light",
      });
      const bg = parseOklch(neutrals.background);
      const border = parseOklch(neutrals.border);

      expect(bg?.c).toBeCloseTo(0.002, 3);
      expect(border?.c).toBeCloseTo(0.002, 3);
    });
  });

  describe("dark mode hierarchy", () => {
    it("evaluates dark mode background layers", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "dark" });
      const bg = parseOklch(neutrals.background);
      const subtle = parseOklch(neutrals.backgroundSubtle);
      const surface = parseOklch(neutrals.surface);
      const elevated = parseOklch(neutrals.surfaceElevated);

      expect(bg?.l).toBeCloseTo(0.13, 3);
      expect(subtle?.l).toBeCloseTo(0.165, 3);
      expect(surface?.l).toBeCloseTo(0.205, 3);
      expect(elevated?.l).toBeCloseTo(0.255, 3);
    });

    it("progressively elevates background layers with 4% to 6% lightness step", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "dark" });
      const bg = parseOklch(neutrals.background);
      const subtle = parseOklch(neutrals.backgroundSubtle);
      const surface = parseOklch(neutrals.surface);
      const elevated = parseOklch(neutrals.surfaceElevated);

      const step1 = (subtle?.l ?? 0) - (bg?.l ?? 0);
      const step2 = (surface?.l ?? 0) - (subtle?.l ?? 0);
      const step3 = (elevated?.l ?? 0) - (surface?.l ?? 0);

      expect(step1).toBeGreaterThanOrEqual(0.03);
      expect(step2).toBeGreaterThanOrEqual(0.03);
      expect(step3).toBeGreaterThanOrEqual(0.04);
    });

    it("evaluates dark mode borders brighter than the canvas", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "dark" });
      const bg = parseOklch(neutrals.background);
      const border = parseOklch(neutrals.border);
      const borderStrong = parseOklch(neutrals.borderStrong);

      expect(border?.l).toBeCloseTo(0.28, 3);
      expect(borderStrong?.l).toBeCloseTo(0.42, 3);

      expect(border?.l).toBeGreaterThan(bg?.l ?? 0);
      expect(borderStrong?.l).toBeGreaterThan(border?.l ?? 0);
    });

    it("evaluates softened off-white heading in dark mode to prevent halation", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "dark" });
      const heading = parseOklch(neutrals.foreground);

      expect(heading?.l).toBeCloseTo(0.95, 3);
      expect(heading?.c).toBeCloseTo(0.005, 3);
    });

    it("evaluates body and muted text variants in dark mode", () => {
      const neutrals = deriveNeutralTokens(brand, { mode: "dark" });
      const body = parseOklch(neutrals.foregroundBody);
      const muted = parseOklch(neutrals.mutedForeground);

      expect(body?.l).toBeCloseTo(0.85, 3);
      expect(body?.c).toBeCloseTo(0.008, 3);
      expect(muted?.l).toBeCloseTo(0.65, 3);
      expect(muted?.c).toBeCloseTo(0.01, 3);
    });
  });
});
