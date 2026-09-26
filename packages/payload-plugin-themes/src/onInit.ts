import type { Payload } from "payload";

import type {
  SyncThemesOptions,
  ThemeSyncDoc,
  ThemeSyncPayload,
} from "./types";
import { ensureDefaultStore } from "./utilities/ensureDefaultStore";
import { getSyncClient } from "./utilities/getSyncClient";
import { syncTemplatesForTheme } from "./utilities/syncTemplatesForTheme";
import { syncThemeForStore } from "./utilities/syncThemeForStore";

export const syncThemes = async (
  payload: Payload | ThemeSyncPayload,
  options: SyncThemesOptions
): Promise<void> => {
  const client = getSyncClient(payload);

  const tenantsSlug = options.tenantsSlug ?? "stores";
  const tenantField = options.tenantField ?? "store";
  const manifests = options.manifests ?? [];

  if (manifests.length === 0) {
    return;
  }

  const pageSize = 100;
  let page = 1;
  let hasMore = true;
  const stores: ThemeSyncDoc[] = [];

  while (hasMore) {
    // oxlint-disable-next-line eslint/no-await-in-loop
    const storesResult = await client.find({
      collection: tenantsSlug,
      depth: 0,
      limit: pageSize,
      page,
      pagination: true,
    });

    if (storesResult.docs.length > 0) {
      stores.push(...storesResult.docs);
    }

    if (
      storesResult.hasNextPage === false ||
      storesResult.docs.length < pageSize ||
      (storesResult.totalPages !== undefined &&
        page >= storesResult.totalPages) ||
      storesResult.docs.length === 0
    ) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  if (stores.length === 0) {
    stores.push(
      await ensureDefaultStore(client, tenantsSlug, options.defaultStoreData)
    );
  }

  await Promise.all(
    stores.flatMap((store) =>
      manifests.map(async (manifest, index) => {
        const isFirstManifest = index === 0;
        const themeId = await syncThemeForStore(
          client,
          store,
          manifest,
          isFirstManifest,
          tenantField
        );

        await syncTemplatesForTheme(
          client,
          store,
          themeId,
          manifest,
          tenantField
        );
      })
    )
  );
};

export const onInit = syncThemes;
