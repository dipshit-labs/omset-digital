import { DEFAULT_THEME_TOKENS, evaluateThemeCssVars } from "@repo/theme-core";
import type {
  TemplateSectionInstance,
  TemplateType,
  ThemeCssVars,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "@repo/theme-core/types";
import { defaultTheme } from "@repo/theme-default";
import type { Page, Store, Template, Theme } from "@repo/types";
import type { Payload } from "payload";

import { getThemeManifest } from "./themes";

export type StorefrontPayloadClient = Pick<Payload, "find">;

export interface ResolveStoreOptions {
  host?: string | null;
  payload: StorefrontPayloadClient;
  storeSlug?: string | null;
}

export interface ResolveStorefrontOptions {
  draft?: boolean;
  host?: string | null;
  payload: StorefrontPayloadClient;
  storeSlug?: string | null;
  templateType?: TemplateType;
  themeParam?: string;
}

export interface ResolvePageStorefrontOptions {
  draft?: boolean;
  host?: string | null;
  payload: StorefrontPayloadClient;
  slug: string;
  storeSlug?: string | null;
  themeParam?: string;
}

export interface PageStorefrontContext extends StorefrontContext {
  page: Page;
}

export interface StorefrontContext {
  manifest: ThemeManifestDefinition;
  sections: TemplateSectionInstance[];
  store: Store;
  template: Template | null;
  theme: Theme | null;
  themeCssVars: Record<string, string> | ThemeCssVars;
}

const RESERVED_SUBDOMAINS = new Set(["www", "admin", "app", "api"]);

export const resolveStore = async ({
  host,
  payload,
  storeSlug,
}: ResolveStoreOptions): Promise<Store | null> => {
  if (storeSlug) {
    const bySlug = await payload.find({
      collection: "stores",
      depth: 0,
      limit: 1,
      where: { slug: { equals: storeSlug } },
    });
    if (bySlug.docs.length > 0) {
      return bySlug.docs[0];
    }
  }

  if (host) {
    const [rawHost] = host.split(":");
    const cleanHost = rawHost.toLowerCase();

    const byCustomDomain = await payload.find({
      collection: "stores",
      depth: 0,
      limit: 1,
      where: { customDomain: { equals: cleanHost } },
    });
    if (byCustomDomain.docs.length > 0) {
      return byCustomDomain.docs[0];
    }

    if (cleanHost.endsWith(".omsetdigital.com")) {
      const subdomain = cleanHost.slice(0, -".omsetdigital.com".length);
      if (!RESERVED_SUBDOMAINS.has(subdomain)) {
        const bySubdomain = await payload.find({
          collection: "stores",
          depth: 0,
          limit: 1,
          where: { slug: { equals: subdomain } },
        });
        if (bySubdomain.docs.length > 0) {
          return bySubdomain.docs[0];
        }
      }
    } else if (cleanHost.endsWith(".localhost")) {
      const subdomain = cleanHost.slice(0, -".localhost".length);
      if (!RESERVED_SUBDOMAINS.has(subdomain)) {
        const bySubdomain = await payload.find({
          collection: "stores",
          depth: 0,
          limit: 1,
          where: { slug: { equals: subdomain } },
        });
        if (bySubdomain.docs.length > 0) {
          return bySubdomain.docs[0];
        }
      }
    }

    if (cleanHost === "localhost" || cleanHost === "127.0.0.1") {
      const byDefault = await payload.find({
        collection: "stores",
        depth: 0,
        limit: 1,
        where: { slug: { equals: "default" } },
      });
      if (byDefault.docs.length > 0) {
        return byDefault.docs[0];
      }

      const anyStore = await payload.find({
        collection: "stores",
        depth: 0,
        limit: 1,
      });
      return anyStore.docs[0] ?? null;
    }
  }

  return null;
};

interface ResolveStoreThemeOptions {
  draft: boolean;
  payload: StorefrontPayloadClient;
  storeId: number | string;
  themeParam?: string;
}

interface ResolvedStoreTheme {
  manifest: ThemeManifestDefinition;
  theme: Theme | null;
  themeCssVars: Record<string, string> | ThemeCssVars;
}

const resolveStoreTheme = async ({
  draft,
  payload,
  storeId,
  themeParam,
}: ResolveStoreThemeOptions): Promise<ResolvedStoreTheme> => {
  let themeDoc: Theme | null = null;

  if (draft && themeParam) {
    const isId = typeof themeParam === "number" || /^\d+$/u.test(themeParam);
    const themeRes = await payload.find({
      collection: "themes",
      depth: 0,
      draft,
      limit: 1,
      overrideAccess: draft,
      where: {
        and: [
          { store: { equals: storeId } },
          isId
            ? { id: { equals: themeParam } }
            : { slug: { equals: themeParam } },
        ],
      },
    });
    themeDoc = themeRes.docs[0] ?? null;
  }

  if (!themeDoc) {
    const liveThemes = await payload.find({
      collection: "themes",
      depth: 0,
      draft,
      limit: 1,
      overrideAccess: draft,
      where: {
        and: [{ store: { equals: storeId } }, { isLive: { equals: true } }],
      },
    });
    themeDoc = liveThemes.docs[0] ?? null;
  }

  if (!themeDoc) {
    const anyThemes = await payload.find({
      collection: "themes",
      depth: 0,
      draft,
      limit: 1,
      overrideAccess: draft,
      where: {
        store: { equals: storeId },
      },
    });
    themeDoc = anyThemes.docs[0] ?? null;
  }

  const themeSlug =
    typeof themeDoc?.slug === "string" ? themeDoc.slug : defaultTheme.slug;
  const manifest = getThemeManifest(themeSlug) ?? defaultTheme;

  const rawSettings =
    themeDoc?.settings && typeof themeDoc.settings === "object"
      ? themeDoc.settings
      : {};
  // SAFETY: Theme document settings record is serializable key-value pairs matching ThemeSettingsRecord.
  const themeSettings = rawSettings as ThemeSettingsRecord;

  const themeCssVars = evaluateThemeCssVars({
    baseTokens: DEFAULT_THEME_TOKENS,
    manifest,
    settings: themeSettings,
  });

  return { manifest, theme: themeDoc, themeCssVars };
};

const extractSections = (
  template: Template | null
): TemplateSectionInstance[] => {
  const rawSections: unknown = template?.sections;
  // SAFETY: Template section arrays match TemplateSectionInstance schema in theme plugin.
  return Array.isArray(rawSections)
    ? (rawSections as TemplateSectionInstance[])
    : [];
};

export const resolveStorefront = async ({
  draft = false,
  host,
  payload,
  storeSlug,
  templateType = "home",
  themeParam,
}: ResolveStorefrontOptions): Promise<StorefrontContext | null> => {
  const store = await resolveStore({ host, payload, storeSlug });
  if (!store) {
    return null;
  }

  const { manifest, theme, themeCssVars } = await resolveStoreTheme({
    draft,
    payload,
    storeId: store.id,
    themeParam,
  });

  let templateDoc: Template | null = null;
  if (theme) {
    const templates = await payload.find({
      collection: "templates",
      depth: 1,
      draft,
      limit: 1,
      overrideAccess: draft,
      where: {
        and: [
          { theme: { equals: theme.id } },
          { type: { equals: templateType } },
        ],
      },
    });
    templateDoc = templates.docs[0] ?? null;
  }

  return {
    manifest,
    sections: extractSections(templateDoc),
    store,
    template: templateDoc,
    theme,
    themeCssVars,
  };
};

interface ResolvePageTemplateOptions {
  draft: boolean;
  pageDoc: Page;
  payload: StorefrontPayloadClient;
}

const resolvePageTemplate = async ({
  draft,
  pageDoc,
  payload,
}: ResolvePageTemplateOptions): Promise<Template | null> => {
  if (!pageDoc.template) {
    return null;
  }

  const templateId =
    typeof pageDoc.template === "object" && pageDoc.template !== null
      ? pageDoc.template.id
      : pageDoc.template;

  if (draft) {
    const templates = await payload.find({
      collection: "templates",
      depth: 1,
      draft: true,
      limit: 1,
      overrideAccess: true,
      where: {
        id: { equals: templateId },
      },
    });
    return templates.docs[0] ?? null;
  }

  if (typeof pageDoc.template === "object" && pageDoc.template !== null) {
    // SAFETY: Populated template object on page document conforms to Template schema.
    return pageDoc.template as Template;
  }

  const templates = await payload.find({
    collection: "templates",
    depth: 1,
    draft: false,
    limit: 1,
    overrideAccess: false,
    where: {
      id: { equals: templateId },
    },
  });
  return templates.docs[0] ?? null;
};

export const resolvePageStorefront = async ({
  draft = false,
  host,
  payload,
  slug,
  storeSlug,
  themeParam,
}: ResolvePageStorefrontOptions): Promise<PageStorefrontContext | null> => {
  const store = await resolveStore({ host, payload, storeSlug });
  if (!store) {
    return null;
  }

  const pages = await payload.find({
    collection: "pages",
    depth: 2,
    draft,
    limit: 1,
    overrideAccess: draft,
    where: {
      and: [{ store: { equals: store.id } }, { slug: { equals: slug } }],
    },
  });

  // SAFETY: Docs returned from pages collection match Page schema.
  const pageDoc = (pages.docs[0] as Page | undefined) ?? null;
  if (!pageDoc) {
    return null;
  }

  const { manifest, theme, themeCssVars } = await resolveStoreTheme({
    draft,
    payload,
    storeId: store.id,
    themeParam,
  });

  const templateDoc = await resolvePageTemplate({
    draft,
    pageDoc,
    payload,
  });

  return {
    manifest,
    page: pageDoc,
    sections: extractSections(templateDoc),
    store,
    template: templateDoc,
    theme,
    themeCssVars,
  };
};
