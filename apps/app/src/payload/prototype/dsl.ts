/**
 * PROTOTYPE: Plain TypeScript Section & Settings Schema DSL
 *
 * This module has ZERO dependency on Payload CMS.
 * Template packages use this DSL to define their theme settings,
 * section schemas, and child blocks.
 */

export type SettingField =
  | { type: "text"; label: string; defaultValue?: string; required?: boolean }
  | {
      type: "textarea";
      label: string;
      defaultValue?: string;
      required?: boolean;
    }
  | { type: "richText"; label: string; required?: boolean }
  | {
      type: "number";
      label: string;
      defaultValue?: number;
      min?: number;
      max?: number;
    }
  | { type: "toggle"; label: string; defaultValue?: boolean }
  | {
      type: "select";
      label: string;
      options: Array<{ label: string; value: string }>;
      defaultValue?: string;
    }
  | { type: "color"; label: string; defaultValue?: string }
  | { type: "upload"; label: string; relationTo: "media" }
  | { type: "link"; label: string }
  | { type: "group"; label: string; fields: Record<string, SettingField> }
  | { type: "array"; label: string; fields: Record<string, SettingField> };

export interface ChildBlockDefinition {
  fields: Record<string, SettingField>;
  name: string;
  slug: string;
}

export interface SectionDefinition {
  blocks?: Record<string, ChildBlockDefinition>;
  description?: string;
  name: string;
  settings: Record<string, SettingField>;
  slug: string;
}

export interface ThemeManifestDefinition {
  cssVars?: (settings: Record<string, unknown>) => Record<string, string>;
  description?: string;
  name: string;
  pagePresets?: Record<
    string,
    {
      title: string;
      slug: string;
      templateType: "home" | "product" | "standard";
      sections: Array<{
        sectionSlug: string;
        settings: Record<string, unknown>;
        blocks?: Array<{ blockSlug: string; data: Record<string, unknown> }>;
      }>;
    }
  >;
  sections: Record<string, SectionDefinition>;
  settings: Record<string, SettingField>;
  slug: string;
}
