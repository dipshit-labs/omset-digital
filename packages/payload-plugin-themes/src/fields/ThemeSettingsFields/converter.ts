import type { Block, Field } from "payload";
import type { ConvertFieldOptions } from "../../types";
import type {
  AnySectionDefinition,
  ArraySettingField,
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
} from "@repo/theme-core";

const convertTextField = (setting: TextSettingField): Field => ({
  name: setting.name,
  type: "text",
  defaultValue: setting.defaultValue,
  label: setting.label,
  required: setting.required,
  admin: {
    description: setting.admin?.description,
    placeholder: setting.placeholder,
  },
});

const convertTextareaField = (setting: TextareaSettingField): Field => ({
  name: setting.name,
  type: "textarea",
  defaultValue: setting.defaultValue,
  label: setting.label,
  required: setting.required,
  admin: {
    description: setting.admin?.description,
    placeholder: setting.placeholder,
  },
});

const convertNumberField = (setting: NumberSettingField): Field => ({
  name: setting.name,
  type: "number",
  defaultValue: setting.defaultValue,
  label: setting.label,
  max: setting.max,
  min: setting.min,
  required: setting.required,
  admin: {
    description: setting.admin?.description,
    step: setting.step,
  },
});

const convertToggleField = (setting: ToggleSettingField): Field => ({
  name: setting.name,
  type: "checkbox",
  defaultValue: setting.defaultValue,
  label: setting.label,
  admin: {
    description: setting.admin?.description,
  },
});

const convertSelectField = (setting: SelectSettingField): Field => ({
  name: setting.name,
  type: "select",
  defaultValue: setting.defaultValue,
  label: setting.label,
  options: setting.options,
  required: setting.required,
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
    name: setting.name,
    type: "upload",
    label: setting.label,
    relationTo,
    required: setting.required,
    admin: {
      description: setting.admin?.description,
    },
  };
};

const convertLinkField = (setting: LinkSettingField): Field => ({
  name: setting.name,
  type: "group",
  label: setting.label,
  admin: {
    description: setting.admin?.description,
  },
  fields: [
    {
      name: "url",
      type: "text",
      defaultValue: setting.defaultValue?.url,
      label: "URL",
      required: setting.required,
    },
    {
      name: "label",
      type: "text",
      defaultValue: setting.defaultValue?.label,
      label: "Label",
    },
    {
      name: "newTab",
      type: "checkbox",
      defaultValue: setting.defaultValue?.newTab ?? false,
      label: "Open in new tab",
    },
  ],
});

const convertGroupField = (
  setting: GroupSettingField,
  convert: (f: SettingField, opts?: ConvertFieldOptions) => Field,
  options?: ConvertFieldOptions
): Field => ({
  name: setting.name,
  type: "group",
  fields: setting.fields.map((f) => convert(f, options)),
  label: setting.label,
  admin: {
    description: setting.admin?.description,
  },
});

const convertArrayField = (
  setting: ArraySettingField,
  convert: (f: SettingField, opts?: ConvertFieldOptions) => Field,
  options?: ConvertFieldOptions
): Field => ({
  name: setting.name,
  type: "array",
  fields: setting.fields.map((f) => convert(f, options)),
  label: setting.label,
  maxRows: setting.maxRows,
  minRows: setting.minRows,
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
        name: setting.name,
        type: "text",
        defaultValue: setting.defaultValue,
        label: setting.label,
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
        name: setting.name,
        type: "richText",
        // SAFETY: RichText editor default value payload conforms to lexical editor state.
        defaultValue: setting.defaultValue as never,
        label: setting.label,
        required: setting.required,
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
        name: setting.name,
        type: "blocks",
        label: setting.label,
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

const childBlockToPayloadBlock = (
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

const sectionToPayloadBlock = (
  themeSlug: string,
  section: AnySectionDefinition,
  options?: ConvertFieldOptions
): Block => {
  const fields: Field[] = (section.settings ?? []).map((s) =>
    settingFieldToPayloadField(s, options)
  );

  if (section.blocks && section.blocks.length > 0) {
    fields.push({
      name: "blocks",
      type: "blocks",
      blocks: section.blocks.map((b) => childBlockToPayloadBlock(b, options)),
      label: "Blocks",
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
