import type { Block, Field } from "payload";
import type {
  ChildBlockDefinition,
  SectionDefinition,
  SettingField,
} from "./dsl";

/**
 * Converts a map of DSL SettingFields into Payload CMS Field definitions.
 */
export function convertSettingFields(
  settings: Record<string, SettingField>
): Field[] {
  return Object.entries(settings).map(([name, setting]): Field => {
    switch (setting.type) {
      case "text":
        return {
          name,
          defaultValue: setting.defaultValue,
          label: setting.label,
          required: setting.required,
          type: "text",
        };

      case "textarea":
        return {
          name,
          defaultValue: setting.defaultValue,
          label: setting.label,
          required: setting.required,
          type: "textarea",
        };

      case "richText":
        return {
          name,
          label: setting.label,
          required: setting.required,
          type: "richText",
        };

      case "number":
        return {
          name,
          defaultValue: setting.defaultValue,
          label: setting.label,
          max: setting.max,
          min: setting.min,
          type: "number",
        };

      case "toggle":
        return {
          name,
          defaultValue: setting.defaultValue ?? false,
          label: setting.label,
          type: "checkbox",
        };

      case "select":
        return {
          name,
          defaultValue: setting.defaultValue,
          label: setting.label,
          options: setting.options,
          type: "select",
        };

      case "color":
        return {
          name,
          defaultValue: setting.defaultValue,
          label: setting.label,
          type: "text",
          admin: {
            description: "Hex color code (e.g. #0f172a)",
          },
        };

      case "upload":
        return {
          name,
          label: setting.label,
          relationTo: setting.relationTo,
          type: "upload",
        };

      case "link":
        return {
          name,
          label: setting.label,
          type: "group",
          fields: [
            { label: "Button / Link Text", name: "label", type: "text" },
            { label: "Target URL", name: "url", type: "text" },
            {
              defaultValue: false,
              label: "Open in new tab",
              name: "openInNewTab",
              type: "checkbox",
            },
          ],
        };

      case "group":
        return {
          name,
          fields: convertSettingFields(setting.fields),
          label: setting.label,
          type: "group",
        };

      case "array":
        return {
          name,
          fields: convertSettingFields(setting.fields),
          label: setting.label,
          type: "array",
        };
      default:
        return {
          name,
          type: "text",
        };
    }
  });
}

/**
 * Converts a SectionDefinition into a native Payload Block with template namespacing.
 */
export function convertSectionToPayloadBlock(
  templateSlug: string,
  section: SectionDefinition
): Block {
  const fields: Field[] = convertSettingFields(section.settings);

  if (section.blocks && Object.keys(section.blocks).length > 0) {
    const childBlocks: Block[] = Object.entries(section.blocks).map(
      ([blockSlug, blockDef]: [string, ChildBlockDefinition]): Block => ({
        fields: convertSettingFields(blockDef.fields),
        slug: `${templateSlug}_${section.slug}_${blockSlug}`,
        labels: {
          plural: `${blockDef.name} Items`,
          singular: blockDef.name,
        },
      })
    );

    fields.push({
      blocks: childBlocks,
      label: "Section Blocks",
      name: "blocks",
      type: "blocks",
    });
  }

  return {
    slug: `${templateSlug}_${section.slug}`,
    labels: {
      plural: `${section.name} Sections`,
      singular: section.name,
    },
    fields,
  };
}
