import { z } from "zod";

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const hexColorSchema = z
  .string()
  .regex(
    hexColorRegex,
    "Must be a valid 3 or 6 digit hex color (e.g. #000 or #0f172a)"
  );

export const TemplateTokenSchema = z.object({
  accent: hexColorSchema,
  accentForeground: hexColorSchema,
  background: hexColorSchema,
  border: hexColorSchema,
  borderRadius: z.enum(["none", "sm", "md", "lg", "full"]),
  card: hexColorSchema,
  cardForeground: hexColorSchema,
  containerWidth: z.enum(["narrow", "normal", "wide", "full"]),
  destructive: hexColorSchema,
  destructiveForeground: hexColorSchema,
  foreground: hexColorSchema,
  input: hexColorSchema,
  muted: hexColorSchema,
  mutedForeground: hexColorSchema,
  popover: hexColorSchema,
  popoverForeground: hexColorSchema,
  primary: hexColorSchema,
  primaryForeground: hexColorSchema,
  ring: hexColorSchema,
  secondary: hexColorSchema,
  secondaryForeground: hexColorSchema,
});

export type TemplateTokens = z.infer<typeof TemplateTokenSchema>;

export type TemplateTokenOverrides = Partial<TemplateTokens>;
