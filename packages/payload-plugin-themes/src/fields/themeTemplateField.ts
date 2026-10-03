import type { RelationshipField } from "payload";

export type ThemeTemplateFieldOptions = Partial<RelationshipField>;

export const themeTemplateField = (
  overrides?: ThemeTemplateFieldOptions
): RelationshipField => {
  const field: RelationshipField = {
    name: "template",
    relationTo: "templates",
    type: "relationship",
    admin: {
      description: "Layout template assigned to this document",
    },
  };

  if (overrides) {
    return Object.assign(field, overrides);
  }

  return field;
};
