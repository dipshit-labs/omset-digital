import type { z } from "zod";
import type { SectionRegistry, SectionType } from "./registry";
import type { TemplateTokenSchema, TemplateTokens } from "./tokens";

export interface TemplateManifest<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> {
  defaultSections: SectionType[];
  defaultSettings?: TSettings;
  defaultTokens: TemplateTokens;
  description?: string;
  fonts?: {
    body?: string;
    heading?: string;
  };
  label: string;
  pageBlocks?: string[];
  previewImage?: string;
  settingsSchema?: z.ZodObject<z.ZodRawShape>;
  slug: string;
  supportedSections: SectionType[];
  tokenSchema: typeof TemplateTokenSchema;
}

export interface TemplatePackage<
  TSettings extends Record<string, unknown> = Record<string, unknown>,
> {
  manifest: TemplateManifest<TSettings>;
  registry: SectionRegistry;
  tokensToCssVars: (tokens: TemplateTokens) => Record<string, string>;
}
