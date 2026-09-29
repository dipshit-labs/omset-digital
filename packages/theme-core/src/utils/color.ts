import {
  clampChroma,
  displayable,
  formatHex,
  modeLrgb,
  modeOklch,
  modeP3,
  modeRgb,
  useMode as registerMode,
  wcagContrast,
} from "culori/fn";

// Initialize required color spaces for optimal tree-shaking and pure SSR execution
registerMode(modeRgb);
registerMode(modeLrgb);
registerMode(modeP3);

const oklch = registerMode(modeOklch);

export interface OklchColor {
  alpha?: number;
  c: number;
  h?: number;
  l: number;
  mode?: "oklch";
}

export interface DeriveBrandRampOptions {
  mode?: "light" | "dark";
}

export interface BrandRamp {
  brand: string;
  brandForeground: string;
  brandHover: string;
  brandSrgb: string;
  brandSubtle: string;
  brandSubtleForeground: string;
}

interface ModeRampConfig {
  hoverLightnessDelta: number;
  subtleBackgroundChroma: number;
  subtleBackgroundLightness: number;
  subtleForegroundChroma: number | null;
  subtleForegroundLightness: number;
}

const MODE_RAMP_CONFIGS: Record<"dark" | "light", ModeRampConfig> = {
  dark: {
    hoverLightnessDelta: 0.06,
    subtleBackgroundChroma: 0.04,
    subtleBackgroundLightness: 0.2,
    subtleForegroundChroma: 0.06,
    subtleForegroundLightness: 0.85,
  },
  light: {
    hoverLightnessDelta: -0.06,
    subtleBackgroundChroma: 0.025,
    subtleBackgroundLightness: 0.965,
    subtleForegroundChroma: null,
    subtleForegroundLightness: 0.38,
  },
};

export const parseOklch = (colorInput: string): OklchColor | null => {
  try {
    const parsed = oklch(colorInput.trim());
    if (!parsed) {
      return null;
    }

    return {
      alpha: parsed.alpha,
      c: parsed.c ?? 0,
      h: parsed.h !== undefined && !Number.isNaN(parsed.h) ? parsed.h : 0,
      l: parsed.l ?? 0,
      mode: "oklch",
    };
  } catch {
    return null;
  }
};

export const formatOklch = (color: OklchColor): string => {
  const l = color.l.toFixed(3);
  const c = color.c.toFixed(3);
  const h = (
    color.h !== undefined && !Number.isNaN(color.h) ? color.h : 0
  ).toFixed(3);

  if (color.alpha !== undefined && color.alpha < 1) {
    const alpha = color.alpha.toFixed(3);
    return `oklch(${l} ${c} ${h} / ${alpha})`;
  }

  return `oklch(${l} ${c} ${h})`;
};

export const getWcagContrast = (colorA: string, colorB: string): number => {
  try {
    const contrast = wcagContrast(colorA, colorB);
    return Number.isFinite(contrast) ? contrast : 1;
  } catch {
    return 1;
  }
};

export const getAccessibleForeground = (
  backgroundColor: string,
  darkColor = "#0f172a",
  lightColor = "#ffffff"
): string => {
  const contrastWithLight = getWcagContrast(backgroundColor, lightColor);
  const contrastWithDark = getWcagContrast(backgroundColor, darkColor);

  return contrastWithLight >= contrastWithDark ? lightColor : darkColor;
};

export const isWideGamut = (colorInput: string): boolean => {
  try {
    const isDisplayable = displayable(colorInput.trim());
    return !isDisplayable;
  } catch {
    return false;
  }
};

export const ensureSrgb = (colorInput: string): string => {
  const trimmed = colorInput.trim();
  try {
    if (!isWideGamut(trimmed)) {
      const hex = formatHex(trimmed);
      return hex ?? trimmed;
    }

    const parsed = parseOklch(trimmed);
    if (!parsed) {
      return trimmed;
    }

    // SAFETY: clampChroma reduces chroma via OKLCH binary search while preserving lightness and hue
    const clamped = clampChroma(
      { c: parsed.c, h: parsed.h, l: parsed.l, mode: "oklch" },
      "oklch"
    );

    const fallbackHex = formatHex(clamped);
    return fallbackHex ?? trimmed;
  } catch {
    return trimmed;
  }
};

export const deriveBrandRamp = (
  brandInput: string,
  options: DeriveBrandRampOptions = {}
): BrandRamp => {
  const mode = options.mode ?? "light";
  let parsed = parseOklch(brandInput);
  let effectiveInput = brandInput;

  if (!parsed) {
    effectiveInput = "#0f172a";
    parsed = parseOklch(effectiveInput) ?? {
      c: 0.04,
      h: 265.755,
      l: 0.208,
      mode: "oklch",
    };
  }

  const { c, h = 0, l } = parsed;
  const config = MODE_RAMP_CONFIGS[mode];

  // Solid primary color in canonical OKLCH
  const brand = formatOklch({ c, h, l });

  // Hover state: lightness shifted by -0.06 in light mode, +0.06 in dark mode
  const hoverL = Math.max(0, Math.min(1, l + config.hoverLightnessDelta));
  const brandHover = formatOklch({ c, h, l: hoverL });

  // Subtle background: oklch(0.965 0.025 h) in light mode, oklch(0.200 0.040 h) in dark mode
  const brandSubtle = formatOklch({
    c: config.subtleBackgroundChroma,
    h,
    l: config.subtleBackgroundLightness,
  });

  // Subtle foreground: oklch(0.380 c h) in light mode, oklch(0.850 0.060 h) in dark mode
  let subtleFgC = config.subtleForegroundChroma;
  if (subtleFgC === null) {
    // SAFETY: Clamping chroma to sRGB bounds ensures subtle text remains in-gamut and readable
    const clampedSubtleFg = clampChroma(
      { c, h, l: config.subtleForegroundLightness, mode: "oklch" },
      "oklch"
    );
    subtleFgC = clampedSubtleFg?.c ?? c;
  }
  const brandSubtleForeground = formatOklch({
    c: subtleFgC,
    h,
    l: config.subtleForegroundLightness,
  });

  // sRGB fallback
  const brandSrgb = ensureSrgb(effectiveInput);

  // Solid foreground: selects #ffffff or #0f172a using WCAG 2.1 AA contrast math on sRGB
  const brandForeground = getAccessibleForeground(brandSrgb);

  return {
    brand,
    brandForeground,
    brandHover,
    brandSrgb,
    brandSubtle,
    brandSubtleForeground,
  };
};
