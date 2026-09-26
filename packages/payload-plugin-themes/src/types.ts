import type { CollectionConfig, RelationshipField } from "payload";

export type SettingFieldType =
  | "array"
  | "blocks"
  | "color"
  | "group"
  | "link"
  | "number"
  | "richText"
  | "select"
  | "text"
  | "textarea"
  | "toggle"
  | "upload";

export type ThemeSettingValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | { [key: string]: ThemeSettingValue }
  | ThemeSettingValue[];

export type ThemeSettingsRecord = Record<string, ThemeSettingValue>;

export interface BaseSettingField {
  admin?: {
    description?: string;
  };
  label: string;
  name: string;
}

export type TextSettingField = BaseSettingField & {
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type: "text";
};

export type TextareaSettingField = BaseSettingField & {
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type: "textarea";
};

export type NumberSettingField = BaseSettingField & {
  defaultValue?: number;
  max?: number;
  min?: number;
  required?: boolean;
  step?: number;
  type: "number";
};

export type ToggleSettingField = BaseSettingField & {
  defaultValue?: boolean;
  type: "toggle";
};

export type ColorSettingField = BaseSettingField & {
  defaultValue?: string;
  type: "color";
};

export interface SelectOption {
  label: string;
  value: string;
}

export type SelectSettingField = BaseSettingField & {
  defaultValue?: string;
  options: SelectOption[];
  required?: boolean;
  type: "select";
};

export type UploadSettingField = BaseSettingField & {
  relationTo?: string;
  required?: boolean;
  type: "upload";
};

export interface LinkSettingValue {
  label?: string;
  newTab?: boolean;
  url: string;
}

export type LinkSettingField = BaseSettingField & {
  defaultValue?: LinkSettingValue;
  required?: boolean;
  type: "link";
};

export type RichTextSettingField = BaseSettingField & {
  defaultValue?: unknown;
  required?: boolean;
  type: "richText";
};

export type GroupSettingField = BaseSettingField & {
  fields: SettingField[];
  type: "group";
};

export type ArraySettingField = BaseSettingField & {
  fields: SettingField[];
  labels?: {
    plural?: string;
    singular?: string;
  };
  maxRows?: number;
  minRows?: number;
  type: "array";
};

export type BlocksSettingField = BaseSettingField & {
  blocks: SectionBlockDefinition[];
  type: "blocks";
};

export type SettingField =
  | ArraySettingField
  | BlocksSettingField
  | ColorSettingField
  | GroupSettingField
  | LinkSettingField
  | NumberSettingField
  | RichTextSettingField
  | SelectSettingField
  | TextareaSettingField
  | TextSettingField
  | ToggleSettingField
  | UploadSettingField;

export interface SectionBlockDefinition {
  fields: SettingField[];
  labels?: {
    plural?: string;
    singular?: string;
  };
  slug: string;
}

export interface SectionPreset<TSettings = ThemeSettingsRecord> {
  blocks?: {
    blockType: string;
    [key: string]: ThemeSettingValue;
  }[];
  name: string;
  settings?: TSettings;
}

export interface SectionProps<
  TSettings = ThemeSettingsRecord,
  TBlocks = ThemeSettingsRecord,
> {
  blockType: string;
  blocks?: TBlocks[];
  id?: string;
  settings?: TSettings;
}

export interface SectionDefinition<
  TSettings = ThemeSettingsRecord,
  TBlocks = ThemeSettingsRecord,
> {
  blocks?: SectionBlockDefinition[];
  category?: string;
  Component?: (props: SectionProps<TSettings, TBlocks>) => unknown;
  description?: string;
  name: string;
  presets?: SectionPreset<TSettings>[];
  settings?: SettingField[];
  slug: string;
}

export interface AnySectionDefinition {
  blocks?: SectionBlockDefinition[];
  category?: string;
  Component?: unknown;
  description?: string;
  name: string;
  presets?: SectionPreset<unknown>[];
  settings?: SettingField[];
  slug: string;
}

export type TemplateType = "collection" | "home" | "page" | "product";

export interface TemplateSectionInstance {
  blockType: string;
  blocks?: {
    blockType: string;
    [key: string]: ThemeSettingValue;
  }[];
  settings?: ThemeSettingsRecord;
  [key: string]: ThemeSettingValue;
}

export interface TemplatePresetDefinition {
  name: string;
  sections: TemplateSectionInstance[];
  type: TemplateType;
}

export interface ThemeManifestDefinition {
  author?: string;
  cssVars?: (settings: ThemeSettingsRecord) => Record<string, string>;
  description?: string;
  name: string;
  sections: AnySectionDefinition[] | Record<string, AnySectionDefinition>;
  settings?: SettingField[];
  slug: string;
  templates?:
    | TemplatePresetDefinition[]
    | Record<string, TemplatePresetDefinition>;
  version: string;
}

export const defineTheme = (
  manifest: ThemeManifestDefinition
): ThemeManifestDefinition => manifest;

export const defineSection = <
  TSettings = ThemeSettingsRecord,
  TBlocks = ThemeSettingsRecord,
>(
  section: SectionDefinition<TSettings, TBlocks>
): SectionDefinition<TSettings, TBlocks> => section;

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
  defaultStoreData?: Record<string, ThemeSettingValue>;
  enabled?: boolean;
  manifests: ThemeManifestDefinition[];
  overrides?: ThemesPluginOverrides;
  slugs?: ThemesPluginSlugs;
  tenantField?: string;
  tenantsSlug?: string;
}

export interface SanitizedThemesPluginOptions {
  autoSync: boolean;
  defaultMediaSlug: string;
  defaultStoreData?: Record<string, ThemeSettingValue>;
  enabled: boolean;
  manifests: ThemeManifestDefinition[];
  overrides: ThemesPluginOverrides;
  slugs: {
    templates: string;
    themes: string;
  };
  tenantField: string;
  tenantsSlug: string;
}

export interface CreateThemesCollectionOptions {
  defaultMediaSlug?: string;
  manifests: ThemeManifestDefinition[];
  overrides?: Partial<CollectionConfig>;
  slug?: string;
  tenantField?: string;
}

export interface CreateTemplatesCollectionOptions {
  defaultMediaSlug?: string;
  manifests: ThemeManifestDefinition[];
  overrides?: Partial<CollectionConfig>;
  slug?: string;
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
  defaultStoreData?: Record<string, ThemeSettingValue>;
  manifests: ThemeManifestDefinition[];
  tenantField?: string;
  tenantsSlug?: string;
}
