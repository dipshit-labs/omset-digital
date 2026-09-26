import type {
  TemplatePresetDefinition,
  ThemeManifestDefinition,
} from "../types";

export const resolveTemplatesList = (
  rawTemplates: ThemeManifestDefinition["templates"]
): TemplatePresetDefinition[] => {
  if (Array.isArray(rawTemplates)) {
    return rawTemplates;
  }

  if (rawTemplates) {
    return Object.values(rawTemplates);
  }

  return [];
};
