import type {
  ThemeManifestDefinition,
  ThemeSyncDoc,
  ThemeSyncPayload,
} from "../types.js";
import { resolveTemplatesList } from "./resolveTemplatesList.js";

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

        await client.create({
          collection: "templates",
          draft: false,
          data: {
            name: tpl.name,
            sections,
            [tenantField]: store.id,
            theme: themeId,
            type: tpl.type,
          },
        });
      }
    })
  );
};
