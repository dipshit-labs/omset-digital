import type { ThemeSyncDoc, ThemeSyncPayload } from "../types";
import type { ThemeManifestDefinition } from "@repo/theme-core";

import { resolveTemplatesList } from "./resolveTemplatesList";

export const syncTemplatesForTheme = async (
  client: ThemeSyncPayload,
  store: ThemeSyncDoc,
  themeId: number | string,
  manifest: ThemeManifestDefinition,
  tenantField: string
): Promise<void> => {
  const templatesList = resolveTemplatesList(manifest.templates);

  await Promise.all(
    templatesList.map(async (tpl) => {
      const existingTemplates = await client.find({
        collection: "templates",
        depth: 0,
        limit: 1,
        where: {
          and: [
            { theme: { equals: themeId } },
            { [tenantField]: { equals: store.id } },
            { type: { equals: tpl.type } },
          ],
        },
      });

      if (existingTemplates.docs.length === 0) {
        const sections = (tpl.sections || []).map((sec) => {
          const rawBlockType = sec.blockType;
          const blockType = rawBlockType.startsWith(`${manifest.slug}_`)
            ? rawBlockType
            : `${manifest.slug}_${rawBlockType}`;

          const { blockType: _, settings, ...rest } = sec;
          return {
            ...settings,
            ...rest,
            blockType,
          };
        });

        const data = {
          name: tpl.name,
          type: tpl.type,
          sections,
          [tenantField]: store.id,
          theme: themeId,
        };

        await client.create({
          collection: "templates",
          data,
          draft: false,
        });
      }
    })
  );
};
