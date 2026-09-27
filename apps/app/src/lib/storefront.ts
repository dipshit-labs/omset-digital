import type {
  TemplateSectionInstance,
  TemplateType,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "@repo/payload-plugin-themes/types";
import { evaluateThemeCssVars } from "@repo/payload-plugin-themes/utilities";
import { defaultTheme } from "@repo/theme-default";
import type { Store, Template, Theme } from "@repo/types";
import { DEFAULT_THEME_TOKENS } from "@repo/ui/tokens";
import type { ThemeCssVars } from "@repo/ui/tokens";
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
      return byDefault.docs[0] ?? null;
    }
  }

  return null;
};

export const resolveStorefront = async ({
  draft = false,
  host,
  payload,
  storeSlug,
  templateType = "home",
}: ResolveStorefrontOptions): Promise<StorefrontContext | null> => {
  const store = await resolveStore({ host, payload, storeSlug });
  if (!store) {
    return null;
  }

  const liveThemes = await payload.find({
    collection: "themes",
    depth: 0,
    draft,
    limit: 1,
    overrideAccess: draft,
    where: {
      and: [{ store: { equals: store.id } }, { isLive: { equals: true } }],
    },
  });
  const themeDoc = liveThemes.docs[0] ?? null;

  const themeSlug =
    typeof themeDoc?.slug === "string" ? themeDoc.slug : defaultTheme.slug;
  const manifest = getThemeManifest(themeSlug) ?? defaultTheme;

  let templateDoc: Template | null = null;
  if (themeDoc) {
    const templates = await payload.find({
      collection: "templates",
      depth: 1,
      draft,
      limit: 1,
      overrideAccess: draft,
      where: {
        and: [
          { theme: { equals: themeDoc.id } },
          { type: { equals: templateType } },
        ],
      },
    });
    templateDoc = templates.docs[0] ?? null;
  }

  const rawSections: unknown = templateDoc?.sections;
  // SAFETY: Template section arrays match TemplateSectionInstance schema in theme plugin.
  const sections: TemplateSectionInstance[] = Array.isArray(rawSections)
    ? (rawSections as TemplateSectionInstance[])
    : [];

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
  return {
    manifest,
    sections,
    store,
    template: templateDoc,
    theme: themeDoc,
    themeCssVars,
  };
};
