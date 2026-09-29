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

export interface DeriveNeutralTokensOptions {
  mode?: "light" | "dark";
}

export interface NeutralTokens {
  background: string;
  backgroundSubtle: string;
  border: string;
  borderStrong: string;
  foreground: string;
  foregroundBody: string;
  mutedForeground: string;
  surface: string;
  surfaceElevated: string;
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

  const { c, h = 0 } = parsed;
  let { l } = parsed;

  if (mode === "dark") {
    // In dark mode, primary brand shifts to 300-400 range (L ~ 0.70 to 0.76) to eliminate chromatic aberration
    l = Math.max(0.7, Math.min(0.76, l < 0.7 ? 0.72 : l));
  }

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

  // sRGB fallback (computed from shifted brand in dark mode so foreground contrast matches)
  const brandSrgb =
    mode === "dark" ? ensureSrgb(brand) : ensureSrgb(effectiveInput);
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

export const deriveNeutralTokens = (
  brandInput: string,
  options: DeriveNeutralTokensOptions = {}
): NeutralTokens => {
  const mode = options.mode ?? "light";
  const parsed = parseOklch(brandInput);
  const brandH = parsed?.h ?? 0;
  const brandC = parsed?.c ?? 0;
  if (mode === "dark") {
    // In dark mode:
    // Canvas: oklch(0.130 0.010 h)
    // Subtle: oklch(0.165 0.012 h)
    // Surface: oklch(0.205 0.015 h)
    // Surface Elevated: oklch(0.255 0.018 h) (+5% lightness step for physical elevation)
    // Border: oklch(0.280 0.015 h)
    // Border Strong: oklch(0.420 0.020 h)
    // Foreground: softened oklch(0.950 0.005 h) to prevent halation
    // Foreground Body: oklch(0.850 0.008 h)
    // Muted Foreground: oklch(0.650 0.010 h)
    return {
      background: formatOklch({
        c: Math.min(brandC, 0.01),
        h: brandH,
        l: 0.13,
      }),
      backgroundSubtle: formatOklch({
        c: Math.min(brandC, 0.012),
        h: brandH,
        l: 0.165,
      }),
      border: formatOklch({
        c: Math.min(brandC, 0.015),
        h: brandH,
        l: 0.28,
      }),
      borderStrong: formatOklch({
        c: Math.min(brandC, 0.02),
        h: brandH,
        l: 0.42,
      }),
      foreground: formatOklch({
        c: Math.min(brandC, 0.005),
        h: brandH,
        l: 0.95,
      }),
      foregroundBody: formatOklch({
        c: Math.min(brandC, 0.008),
        h: brandH,
        l: 0.85,
      }),
      mutedForeground: formatOklch({
        c: Math.min(brandC, 0.01),
        h: brandH,
        l: 0.65,
      }),
      surface: formatOklch({
        c: Math.min(brandC, 0.015),
        h: brandH,
        l: 0.205,
      }),
      surfaceElevated: formatOklch({
        c: Math.min(brandC, 0.018),
        h: brandH,
        l: 0.255,
      }),
    };
  }

  // Light mode:
  // Background (base canvas): Off-white tint oklch(0.985 0.005 h), making white product cards pop naturally
  // Subtle: oklch(0.960 0.008 h)
  // Surface (product cards): #ffffff to protect product photo white balance
  // Surface Elevated (modals, popovers, drawers): #ffffff
  // Border: oklch(0.910 0.008 h)
  // Border Strong: oklch(0.750 0.015 h)
  // Foreground: oklch(0.180 0.015 h)
  // Foreground Body: oklch(0.300 0.015 h)
  // Muted Foreground: oklch(0.550 0.015 h)
  return {
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    background: formatOklch({
      c: Math.min(brandC, 0.005),
      h: brandH,
      l: 0.985,
    }),
    backgroundSubtle: formatOklch({
      c: Math.min(brandC, 0.008),
      h: brandH,
      l: 0.96,
    }),
    border: formatOklch({
      c: Math.min(brandC, 0.008),
      h: brandH,
      l: 0.91,
    }),
    borderStrong: formatOklch({
      c: Math.min(brandC, 0.015),
      h: brandH,
      l: 0.75,
    }),
    foreground: formatOklch({
      c: Math.min(brandC, 0.015),
      h: brandH,
      l: 0.18,
    }),
    foregroundBody: formatOklch({
      c: Math.min(brandC, 0.015),
      h: brandH,
      l: 0.3,
    }),
    mutedForeground: formatOklch({
      c: Math.min(brandC, 0.015),
      h: brandH,
      l: 0.55,
    }),
  };
};
