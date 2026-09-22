import type { CollectionAfterChangeHook } from "payload";
import type { Theme } from "@/payload/payload-types";
import { defaultTemplateManifest } from "@/payload/prototype/sample-template";

export const seedThemeTemplatesAfterChange: CollectionAfterChangeHook<
  Theme
> = async ({ doc, operation, req }) => {
  if (operation !== "create") {
    return doc;
  }

  const tenantRaw = doc.tenant;
  const tenantId =
    typeof tenantRaw === "object" && tenantRaw !== null
      ? tenantRaw.id
      : tenantRaw;

  if (!tenantId) {
    return doc;
  }

  const homePreset = defaultTemplateManifest.pagePresets?.home;
  const defaultSections = homePreset
    ? homePreset.sections.map((sec) => ({
        blockType: `${doc.templateSlug}_${sec.sectionSlug}`,
        ...sec.settings,
        ...(sec.blocks
          ? {
              blocks: sec.blocks.map((b) => ({
                blockType: `${doc.templateSlug}_${sec.sectionSlug}_${b.blockSlug}`,
                ...b.data,
              })),
            }
          : {}),
      }))
    : [];

  await req.payload.create({
    collection: "templates",
    overrideAccess: true,
    req,
    data: {
      isSystem: true,
      name: "Home page",
      sections: defaultSections as never,
      tenant: tenantId,
      theme: doc.id,
      type: "home",
    },
  });

  await req.payload.create({
    collection: "templates",
    overrideAccess: true,
    req,
    data: {
      isSystem: true,
      name: "Default product",
      sections: [],
      tenant: tenantId,
      theme: doc.id,
      type: "product",
    },
  });

  await req.payload.create({
    collection: "templates",
    overrideAccess: true,
    req,
    data: {
      isSystem: true,
      name: "Default collection",
      sections: [],
      tenant: tenantId,
      theme: doc.id,
      type: "collection",
    },
  });

  await req.payload.create({
    collection: "templates",
    overrideAccess: true,
    req,
    data: {
      isSystem: false,
      name: "Default page",
      sections: [],
      tenant: tenantId,
      theme: doc.id,
      type: "page",
    },
  });

  return doc;
};
