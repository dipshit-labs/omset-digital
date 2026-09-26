import type { Condition, Field } from "payload";

import type { ThemeManifestDefinition } from "../types.js";
import { settingFieldToPayloadField } from "./ThemeTemplateField/converter.js";

export const buildThemeSettingsFields = (
  manifests: ThemeManifestDefinition[],
  defaultMediaSlug?: string
): Field[] => {
  const settingsFieldsMap = new Map<
    string,
    { field: Field; themeSlugs: Set<string> }
  >();

  for (const manifest of manifests) {
    if (manifest.settings && manifest.settings.length > 0) {
      for (const s of manifest.settings) {
        const existing = settingsFieldsMap.get(s.name);
        if (existing) {
          existing.themeSlugs.add(manifest.slug);
        } else {
          const field = settingFieldToPayloadField(s, { defaultMediaSlug });
          settingsFieldsMap.set(s.name, {
            field,
            themeSlugs: new Set([manifest.slug]),
          });
        }
      }
    }
  }

  const allManifestSlugs = new Set(manifests.map((m) => m.slug));
  const settingsFields: Field[] = [];

  for (const [, { field, themeSlugs }] of settingsFieldsMap) {
    if (manifests.length > 1 && themeSlugs.size < allManifestSlugs.size) {
      const originalAdmin = field.admin || {};
      const originalCondition = originalAdmin.condition;
      const condition: Condition = (data, siblingData, context) => {
        if (
          originalCondition &&
          !originalCondition(data, siblingData, context)
        ) {
          return false;
        }
        if (
          data &&
          typeof data === "object" &&
          "slug" in data &&
          typeof data.slug === "string"
        ) {
          return themeSlugs.has(data.slug);
        }
        return true;
      };
      field.admin = {
        ...originalAdmin,
        condition,
      };
    }
    settingsFields.push(field);
  }

  return settingsFields;
};
