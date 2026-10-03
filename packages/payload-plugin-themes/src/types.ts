import type {
  ThemeManifestDefinition,
  ThemeSettingValue,
} from "@repo/theme-core";
import type { CollectionConfig } from "payload";

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
