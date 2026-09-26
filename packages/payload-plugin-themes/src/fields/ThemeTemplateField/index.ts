import type { RelationshipField } from "payload";

import type { ThemeTemplateFieldOptions } from "../../types";

export {
  childBlockToPayloadBlock,
  manifestToPayloadBlocks,
  sectionToPayloadBlock,
  settingFieldToPayloadField,
  type ConvertFieldOptions,
} from "./converter";
export type { ThemeTemplateFieldOptions } from "../../types";
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
