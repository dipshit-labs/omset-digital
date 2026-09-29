import { describe, expect, it } from "vitest";

import {
  deriveBrandRamp,
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
  });
});
