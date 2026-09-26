import type { Block, Field } from "payload";

import type {
  AnySectionDefinition,
  ArraySettingField,
  ConvertFieldOptions,
  GroupSettingField,
  LinkSettingField,
  NumberSettingField,
  SectionBlockDefinition,
  SelectSettingField,
  SettingField,
  TextareaSettingField,
  TextSettingField,
  ThemeManifestDefinition,
  ToggleSettingField,
  UploadSettingField,
} from "../../types";

export type { ConvertFieldOptions } from "../../types";

const convertTextField = (setting: TextSettingField): Field => ({
  defaultValue: setting.defaultValue,
  label: setting.label,
  name: setting.name,
  required: setting.required,
  type: "text",
  admin: {
    description: setting.admin?.description,
    placeholder: setting.placeholder,
  },
});

const convertTextareaField = (setting: TextareaSettingField): Field => ({
  defaultValue: setting.defaultValue,
  label: setting.label,
  name: setting.name,
  required: setting.required,
  type: "textarea",
  admin: {
    description: setting.admin?.description,
    placeholder: setting.placeholder,
  },
});

const convertNumberField = (setting: NumberSettingField): Field => ({
  defaultValue: setting.defaultValue,
  label: setting.label,
  max: setting.max,
  min: setting.min,
  name: setting.name,
  required: setting.required,
  type: "number",
  admin: {
    description: setting.admin?.description,
    step: setting.step,
  },
});

const convertToggleField = (setting: ToggleSettingField): Field => ({
  defaultValue: setting.defaultValue,
  label: setting.label,
  name: setting.name,
  type: "checkbox",
  admin: {
    description: setting.admin?.description,
  },
});

const convertSelectField = (setting: SelectSettingField): Field => ({
  defaultValue: setting.defaultValue,
  label: setting.label,
  name: setting.name,
  options: setting.options,
  required: setting.required,
  type: "select",
  admin: {
    description: setting.admin?.description,
  },
});

const convertUploadField = (
  setting: UploadSettingField,
  options?: ConvertFieldOptions
): Field => {
  // SAFETY: Payload requires CollectionSlug union; fallback to configured media collection or standard media.
  const relationTo = (setting.relationTo ??
    options?.defaultMediaSlug ??
    "media") as "media";

  return {
    label: setting.label,
    name: setting.name,
    relationTo,
    required: setting.required,
    type: "upload",
    admin: {
      description: setting.admin?.description,
    },
  };
};

const convertLinkField = (setting: LinkSettingField): Field => ({
  label: setting.label,
  name: setting.name,
  type: "group",
  admin: {
    description: setting.admin?.description,
  },
  fields: [
    {
      defaultValue: setting.defaultValue?.url,
      label: "URL",
      name: "url",
      required: setting.required,
      type: "text",
    },
    {
      defaultValue: setting.defaultValue?.label,
      label: "Label",
      name: "label",
      type: "text",
    },
    {
      defaultValue: setting.defaultValue?.newTab ?? false,
      label: "Open in new tab",
      name: "newTab",
      type: "checkbox",
    },
  ],
});

const convertGroupField = (
  setting: GroupSettingField,
  convert: (f: SettingField, opts?: ConvertFieldOptions) => Field,
  options?: ConvertFieldOptions
): Field => ({
  fields: setting.fields.map((f) => convert(f, options)),
  label: setting.label,
  name: setting.name,
  type: "group",
  admin: {
    description: setting.admin?.description,
  },
});

const convertArrayField = (
  setting: ArraySettingField,
  convert: (f: SettingField, opts?: ConvertFieldOptions) => Field,
  options?: ConvertFieldOptions
): Field => ({
  fields: setting.fields.map((f) => convert(f, options)),
  label: setting.label,
  maxRows: setting.maxRows,
  minRows: setting.minRows,
  name: setting.name,
  type: "array",
  admin: {
    description: setting.admin?.description,
  },
  labels: setting.labels
    ? {
        plural: setting.labels.plural ?? setting.name,
        singular: setting.labels.singular ?? setting.name,
      }
    : undefined,
});

export const settingFieldToPayloadField = (
  setting: SettingField,
  options?: ConvertFieldOptions
): Field => {
  switch (setting.type) {
    case "text": {
      return convertTextField(setting);
    }
    case "textarea": {
      return convertTextareaField(setting);
    }
    case "number": {
      return convertNumberField(setting);
    }
    case "toggle": {
      return convertToggleField(setting);
    }
    case "color": {
      return {
        defaultValue: setting.defaultValue,
        label: setting.label,
        name: setting.name,
        type: "text",
        admin: {
          description: setting.admin?.description,
        },
      };
    }
    case "select": {
      return convertSelectField(setting);
    }
    case "upload": {
      return convertUploadField(setting, options);
    }
    case "link": {
      return convertLinkField(setting);
    }
    case "richText": {
      return {
        // SAFETY: RichText editor default value payload conforms to lexical editor state.
        defaultValue: setting.defaultValue as never,
        label: setting.label,
        name: setting.name,
        required: setting.required,
        type: "richText",
        admin: {
          description: setting.admin?.description,
        },
      };
    }
    case "group": {
      return convertGroupField(setting, settingFieldToPayloadField, options);
    }
    case "array": {
      return convertArrayField(setting, settingFieldToPayloadField, options);
    }
    case "blocks": {
      return {
        label: setting.label,
        name: setting.name,
        type: "blocks",
        admin: {
          description: setting.admin?.description,
        },
        blocks: setting.blocks.map((childBlock) => ({
          slug: childBlock.slug,
          fields: childBlock.fields.map((f) =>
            settingFieldToPayloadField(f, options)
          ),
          labels: {
            plural: childBlock.labels?.plural ?? childBlock.slug,
            singular: childBlock.labels?.singular ?? childBlock.slug,
          },
        })),
      };
    }
    default: {
      const exhaustiveCheck: never = setting;
      throw new Error(
        `Unhandled setting field type: ${String(exhaustiveCheck)}`
      );
    }
  }
};

export const childBlockToPayloadBlock = (
  childBlock: SectionBlockDefinition,
  options?: ConvertFieldOptions
): Block => ({
  fields: childBlock.fields.map((f) => settingFieldToPayloadField(f, options)),
  slug: childBlock.slug,
  labels: {
    plural: childBlock.labels?.plural ?? childBlock.slug,
    singular: childBlock.labels?.singular ?? childBlock.slug,
  },
});

export const sectionToPayloadBlock = (
  themeSlug: string,
  section: AnySectionDefinition,
  options?: ConvertFieldOptions
): Block => {
  const fields: Field[] = (section.settings ?? []).map((s) =>
    settingFieldToPayloadField(s, options)
  );

  if (section.blocks && section.blocks.length > 0) {
    fields.push({
      blocks: section.blocks.map((b) => childBlockToPayloadBlock(b, options)),
      label: "Blocks",
      name: "blocks",
      type: "blocks",
    });
  }

  return {
    fields,
    slug: `${themeSlug}_${section.slug}`,
    labels: {
      plural: section.name,
      singular: section.name,
    },
  };
};

export const manifestToPayloadBlocks = (
  manifest: ThemeManifestDefinition,
  options?: ConvertFieldOptions
): Block[] => {
  const sections = Array.isArray(manifest.sections)
    ? manifest.sections
    : Object.values(manifest.sections);

  return sections.map((section) =>
    sectionToPayloadBlock(manifest.slug, section, options)
  );
};
