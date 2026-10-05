import type { Payload } from "payload";
import type {
  SyncThemesOptions,
  ThemeSyncDoc,
  ThemeSyncPayload,
} from "./types";

import { getSyncClient } from "./utilities/getSyncClient";
import { syncTemplatesForTheme } from "./utilities/syncTemplatesForTheme";
import { syncThemeForStore } from "./utilities/syncThemeForStore";

export const syncThemes = async (
  payload: Payload | ThemeSyncPayload,
  options: SyncThemesOptions
): Promise<void> => {
  const manifests = options.manifests ?? [];
  const { tenantField } = options;

  if (manifests.length === 0 || !tenantField) {
    return;
  }

  const client = getSyncClient(payload);
  const tenantsSlug = options.tenantsSlug ?? "stores";
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
    return;
  }

  await Promise.all(
    stores.map(async (store) => {
      const existingLiveThemes = await client.find({
        collection: "themes",
        depth: 0,
        limit: 1,
        where: {
          and: [
            { [tenantField]: { equals: store.id } },
            { isLive: { equals: true } },
          ],
        },
      });

      let hasActiveLiveTheme = existingLiveThemes.docs.length > 0;

      for (const [index, manifest] of manifests.entries()) {
        const shouldBeLive = !hasActiveLiveTheme && index === 0;
        // oxlint-disable-next-line eslint/no-await-in-loop
        const themeId = await syncThemeForStore(
          client,
          store,
          manifest,
          shouldBeLive,
          tenantField
        );

        if (shouldBeLive) {
          hasActiveLiveTheme = true;
        }

        // oxlint-disable-next-line eslint/no-await-in-loop
        await syncTemplatesForTheme(
          client,
          store,
          themeId,
          manifest,
          tenantField
        );
      }
    })
  );
};
