import type {
  ThemeManifestDefinition,
  ThemeSyncDoc,
  ThemeSyncPayload,
} from "../types.js";
import { extractDefaultSettings } from "./extractDefaultSettings.js";

export const syncThemeForStore = async (
  client: ThemeSyncPayload,
  store: ThemeSyncDoc,
  manifest: ThemeManifestDefinition,
  isLive: boolean,
  tenantField: string
): Promise<number | string> => {
  const existingThemes = await client.find({
    collection: "themes",
    depth: 0,
    limit: 1,
    where: {
      and: [
        { slug: { equals: manifest.slug } },
        { [tenantField]: { equals: store.id } },
      ],
    },
  });

  if (existingThemes.docs.length > 0) {
    return existingThemes.docs[0].id;
  }

  const defaultSettings = extractDefaultSettings(manifest);
  const newTheme = await client.create({
    collection: "themes",
    draft: false,
    data: {
      isLive,
      name: manifest.name,
      settings: defaultSettings,
      slug: manifest.slug,
      [tenantField]: store.id,
      version: manifest.version,
    },
  });

  return newTheme.id;
};
