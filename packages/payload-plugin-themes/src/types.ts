import type {
  ThemeManifestDefinition,
  ThemeSettingValue,
} from "@repo/theme-core";
import type { CollectionConfig, RelationshipField } from "payload";

export {
  defineSection,
  defineTheme,
  type AnySectionDefinition,
  type ArraySettingField,
  type BaseSettingField,
  type BlocksSettingField,
  type ColorSettingField,
  type GroupSettingField,
  type LinkSettingField,
  type LinkSettingValue,
  type NumberSettingField,
  type RichTextSettingField,
  type SectionBlockDefinition,
  type SectionDefinition,
  type SectionPreset,
  type SectionProps,
  type SelectOption,
  type SelectSettingField,
  type SettingField,
  type SettingFieldType,
  type TemplatePresetDefinition,
  type TemplateSectionInstance,
  type TemplateType,
  type TextSettingField,
  type TextareaSettingField,
  type ThemeClientManifest,
  type ThemeManifestDefinition,
  type ThemeSettingsRecord,
  type ThemeSettingValue,
  type ToggleSettingField,
  type UploadSettingField,
} from "@repo/theme-core";

export interface ThemesPluginSlugs {
  templates?: string;
  themes?: string;
}

export interface ThemesPluginOverrides {
  templates?: Partial<CollectionConfig>;
  themes?: Partial<CollectionConfig>;
}

export interface ThemesPluginOptions {
  autoSync?: boolean;
  defaultMediaSlug?: string;
  enabled?: boolean;
  manifests: ThemeManifestDefinition[];
  overrides?: ThemesPluginOverrides;
  slugs?: ThemesPluginSlugs;
  previewSecret?: string;
  tenantField?: string;
  tenantsSlug?: string;
}

export interface SanitizedThemesPluginOptions {
  autoSync: boolean;
  defaultMediaSlug: string;
  enabled: boolean;
  manifests: ThemeManifestDefinition[];
  overrides: ThemesPluginOverrides;
  slugs: {
    templates: string;
    themes: string;
  };
  previewSecret?: string;
  tenantField?: string;
  tenantsSlug?: string;
}

export interface CreateThemesCollectionOptions {
  defaultMediaSlug?: string;
  manifests: ThemeManifestDefinition[];
  overrides?: Partial<CollectionConfig>;
  slug?: string;
  previewSecret?: string;
  tenantField?: string;
  tenantsSlug?: string;
}

export interface CreateTemplatesCollectionOptions {
  defaultMediaSlug?: string;
  manifests: ThemeManifestDefinition[];
  overrides?: Partial<CollectionConfig>;
  slug?: string;
  previewSecret?: string;
  tenantField?: string;
  tenantsSlug?: string;
  themesSlug?: string;
}

export type ThemeTemplateFieldOptions = Partial<RelationshipField>;

export interface ConvertFieldOptions {
  defaultMediaSlug?: string;
}

export interface ThemeSyncDoc {
  id: number | string;
  [key: string]: ThemeSettingValue;
}

export interface ThemeSyncPayload {
  create: (options: {
    collection: string;
    data: Record<string, ThemeSettingValue>;
    draft?: boolean;
  }) => Promise<ThemeSyncDoc>;
  find: (options: {
    collection: string;
    depth?: number;
    limit?: number;
    page?: number;
    pagination?: boolean;
    where?: Record<string, ThemeSettingValue>;
  }) => Promise<{
    docs: ThemeSyncDoc[];
    hasNextPage?: boolean;
    nextPage?: null | number;
    page?: number;
    totalDocs: number;
    totalPages?: number;
  }>;
  logger?: {
    info?: (msg: string) => void;
  };
}

export interface SyncThemesOptions {
  manifests: ThemeManifestDefinition[];
  tenantField?: string;
  tenantsSlug?: string;
}
