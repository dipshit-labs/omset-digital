import type { CheckboxField, TextField } from "payload";

import { formatSlugHook } from "./hooks";

interface SlugFieldOverrides {
  checkboxOverrides?: Partial<CheckboxField>;
  slugOverrides?: Partial<TextField>;
}

type Slug = (
  fieldToUse?: string,
  overrides?: SlugFieldOverrides
) => [TextField, CheckboxField];

export const slugField: Slug = (fieldToUse = "title", overrides = {}) => {
  const { checkboxOverrides, slugOverrides } = overrides;

  const checkBoxField: CheckboxField = {
    defaultValue: true,
    name: "slugLock",
    type: "checkbox",
    admin: {
      hidden: true,
      position: "sidebar",
    },
    ...checkboxOverrides,
  };

  // SAFETY: slugOverrides preserves field type and structure satisfies TextField.
  const slugFieldConfig: TextField = {
    index: true,
    label: "Slug",
    name: "slug",
    type: "text",
    unique: true,
    ...slugOverrides,
    admin: {
      position: "sidebar",
      ...slugOverrides?.admin,
      components: {
        Field: {
          path: "@/payload/fields/slug/Component#SlugComponent",
          clientProps: {
            checkboxFieldPath: checkBoxField.name,
            fieldToUse,
          },
        },
      },
    },
    hooks: {
      beforeValidate: [formatSlugHook(fieldToUse)],
    },
  } as TextField;

  return [slugFieldConfig, checkBoxField];
};

export const SlugField = slugField;
