import type { ArrayField, BlocksField, Field, GroupField } from "payload";
import { describe, expect, it } from "vitest";

import type {
  SectionDefinition,
  SettingField,
  ThemeManifestDefinition,
} from "../../types.js";
import {
  manifestToPayloadBlocks,
  sectionToPayloadBlock,
  settingFieldToPayloadField,
} from "./converter.js";

describe(settingFieldToPayloadField, () => {
  it("converts text field correctly", () => {
    const field: SettingField = {
      admin: { description: "Main headline" },
      defaultValue: "Welcome",
      label: "Heading",
      name: "heading",
      placeholder: "Enter title",
      required: true,
      type: "text",
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      defaultValue: "Welcome",
      label: "Heading",
      name: "heading",
      required: true,
      type: "text",
      admin: {
        description: "Main headline",
        placeholder: "Enter title",
      },
    });
  });

  it("converts toggle field to checkbox", () => {
    const field: SettingField = {
      defaultValue: true,
      label: "Show Badge",
      name: "showBadge",
      type: "toggle",
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      defaultValue: true,
      label: "Show Badge",
      name: "showBadge",
      type: "checkbox",
      admin: {
        description: undefined,
      },
    });
  });

  it("converts select field with options", () => {
    const field: SettingField = {
      defaultValue: "left",
      label: "Alignment",
      name: "alignment",
      required: true,
      type: "select",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
      ],
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      defaultValue: "left",
      label: "Alignment",
      name: "alignment",
      required: true,
      type: "select",
      admin: {
        description: undefined,
      },
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
      ],
    });
  });

  it("converts upload field with default relationTo media", () => {
    const field: SettingField = {
      label: "Image",
      name: "image",
      type: "upload",
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      label: "Image",
      name: "image",
      relationTo: "media",
      required: undefined,
      type: "upload",
      admin: {
        description: undefined,
      },
    });
  });

  it("converts link field to structured group", () => {
    const field: SettingField = {
      label: "Call to Action",
      name: "cta",
      type: "link",
      defaultValue: {
        label: "Shop Now",
        newTab: false,
        url: "https://example.com",
      },
    };
    // SAFETY: Setting with type "link" converts to GroupField with name and fields.
    const payloadField = settingFieldToPayloadField(field) as GroupField & {
      name: string;
    };

    expect(payloadField.type).toBe("group");
    expect(payloadField.name).toBe("cta");
    expect(payloadField.label).toBe("Call to Action");
    const subfieldNames = payloadField.fields.map((f: Field) =>
      "name" in f ? f.name : ""
    );
    expect(subfieldNames).toStrictEqual(
      expect.arrayContaining(["url", "label", "newTab"])
    );
  });

  it("converts nested group and array fields recursively", () => {
    const field: SettingField = {
      label: "Slides",
      maxRows: 5,
      minRows: 1,
      name: "slides",
      type: "array",
      fields: [
        {
          label: "Slide Title",
          name: "title",
          type: "text",
        },
      ],
    };
    // SAFETY: Setting with type "array" converts to ArrayField with name and min/max rows.
    const payloadField = settingFieldToPayloadField(field) as ArrayField & {
      name: string;
    };

    expect(payloadField.type).toBe("array");
    expect(payloadField.name).toBe("slides");
    expect(payloadField.minRows).toBe(1);
    expect(payloadField.maxRows).toBe(5);
    expect(payloadField.fields).toHaveLength(1);
  });
});

describe(sectionToPayloadBlock, () => {
  it("namespaces block slug as {themeSlug}_{sectionSlug}", () => {
    const section: SectionDefinition = {
      name: "Hero Section",
      slug: "hero",
      settings: [
        {
          label: "Heading",
          name: "heading",
          type: "text",
        },
      ],
    };

    const block = sectionToPayloadBlock("default", section);

    expect(block.slug).toBe("default_hero");
    expect(block.labels).toStrictEqual({
      plural: "Hero Section",
      singular: "Hero Section",
    });
    expect(block.fields).toHaveLength(1);
    expect(block.fields[0].type).toBe("text");
  });

  it("converts child block definitions within sections into child blocks on the section block", () => {
    const section: SectionDefinition = {
      name: "Features",
      slug: "features",
      blocks: [
        {
          labels: { plural: "Features", singular: "Feature" },
          slug: "feature_item",
          fields: [
            {
              label: "Feature Title",
              name: "title",
              type: "text",
            },
            {
              label: "Description",
              name: "description",
              type: "textarea",
            },
          ],
        },
      ],
      settings: [
        {
          label: "Title",
          name: "title",
          type: "text",
        },
      ],
    };

    const block = sectionToPayloadBlock("modern", section);

    expect(block.slug).toBe("modern_features");
    expect(block.fields).toHaveLength(2);
    // SAFETY: Section block contains blocks field as defined in section definition.
    const blocksField = block.fields.find(
      (f: Field) => "name" in f && f.name === "blocks"
    ) as BlocksField | undefined;
    expect(blocksField?.blocks).toHaveLength(1);
    expect(blocksField?.blocks[0].slug).toBe("feature_item");
    expect(blocksField?.blocks[0].fields).toHaveLength(2);
  });
});

describe(manifestToPayloadBlocks, () => {
  it("converts all sections in a theme manifest into namespaced blocks", () => {
    const manifest: ThemeManifestDefinition = {
      name: "Default Theme",
      slug: "default",
      version: "1.0.0",
      sections: [
        {
          name: "Hero",
          slug: "hero",
          settings: [
            {
              label: "Title",
              name: "title",
              type: "text",
            },
          ],
        },
        {
          name: "Banner",
          slug: "banner",
          settings: [
            {
              label: "Text",
              name: "text",
              type: "text",
            },
          ],
        },
      ],
    };

    const blocks = manifestToPayloadBlocks(manifest);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].slug).toBe("default_hero");
    expect(blocks[1].slug).toBe("default_banner");
  });
});
