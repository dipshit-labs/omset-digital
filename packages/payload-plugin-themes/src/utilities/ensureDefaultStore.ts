import type {
  ThemeSettingValue,
  ThemeSyncDoc,
  ThemeSyncPayload,
} from "../types";

export const ensureDefaultStore = (
  client: ThemeSyncPayload,
  tenantsSlug: string,
  defaultStoreData?: Record<string, ThemeSettingValue>
): Promise<ThemeSyncDoc> => {
  client.logger?.info?.(
    "[themesPlugin] No stores found. Provisioning default trial store..."
  );

  return client.create({
    collection: tenantsSlug,
    draft: false,
    data: defaultStoreData ?? {
      name: "Default Store",
      slug: "default",
      subscription: {
        status: "trial",
      },
    },
  });
};
