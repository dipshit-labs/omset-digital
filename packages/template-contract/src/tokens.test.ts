import { describe, expect, it } from "bun:test";
import { TemplateTokenSchema, type TemplateTokens } from "./tokens";

describe("TemplateTokenSchema - Full Shadcn & Tailwind Mapping", () => {
  const completeTokens: TemplateTokens = {
    accent: "#f1f5f9",
    accentForeground: "#0f172a",
    background: "#ffffff",
    border: "#e2e8f0",
    borderRadius: "md",
    card: "#ffffff",
    cardForeground: "#09090b",
    containerWidth: "normal",
    destructive: "#ef4444",
    destructiveForeground: "#f8fafc",
    foreground: "#09090b",
    input: "#e2e8f0",
    muted: "#f8fafc",
    mutedForeground: "#64748b",
    popover: "#ffffff",
    popoverForeground: "#09090b",
    primary: "#0f172a",
    primaryForeground: "#ffffff",
    ring: "#0f172a",
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",
  };

  it("parses complete tokens successfully when all variables are filled", () => {
    const result = TemplateTokenSchema.parse(completeTokens);
    expect(result).toEqual(completeTokens);
  });

  it("fails validation if any shadcn variable is missing", () => {
    const missingBorder = { ...completeTokens } as Record<string, unknown>;
    missingBorder.border = undefined;
    expect(() => TemplateTokenSchema.parse(missingBorder)).toThrow();

    const missingPrimaryForeground = { ...completeTokens } as Record<
      string,
      unknown
    >;
    missingPrimaryForeground.primaryForeground = undefined;
    expect(() => TemplateTokenSchema.parse(missingPrimaryForeground)).toThrow();

    const missingRing = { ...completeTokens } as Record<string, unknown>;
    missingRing.ring = undefined;
    expect(() => TemplateTokenSchema.parse(missingRing)).toThrow();

    const missingCard = { ...completeTokens } as Record<string, unknown>;
    missingCard.card = undefined;
    expect(() => TemplateTokenSchema.parse(missingCard)).toThrow();

    const missingInput = { ...completeTokens } as Record<string, unknown>;
    missingInput.input = undefined;
    expect(() => TemplateTokenSchema.parse(missingInput)).toThrow();
  });

  it("rejects CSS injection attempts in color tokens", () => {
    const maliciousTokens = {
      ...completeTokens,
      primary: "; background: red;",
    };
    expect(() => TemplateTokenSchema.parse(maliciousTokens)).toThrow();
  });

  it("rejects invalid hex colors", () => {
    const invalidColorTokens = {
      ...completeTokens,
      primary: "rgb(15, 23, 42)",
    };
    expect(() => TemplateTokenSchema.parse(invalidColorTokens)).toThrow();
  });

  it("rejects invalid borderRadius values outside the closed vocabulary", () => {
    const invalidRadius = {
      ...completeTokens,
      borderRadius: "huge",
    };
    expect(() => TemplateTokenSchema.parse(invalidRadius)).toThrow();
  });

  it("rejects invalid containerWidth values outside the closed vocabulary", () => {
    const invalidWidth = {
      ...completeTokens,
      containerWidth: "1400px",
    };
    expect(() => TemplateTokenSchema.parse(invalidWidth)).toThrow();
  });
});
