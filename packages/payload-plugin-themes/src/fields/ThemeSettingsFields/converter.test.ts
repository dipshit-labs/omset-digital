import type { SettingField, ThemeManifestDefinition } from "@repo/theme-core";
import type { ArrayField, BlocksField, Field, GroupField } from "payload";
import { describe, expect, it } from "vitest";

import {
  manifestToPayloadBlocks,
  settingFieldToPayloadField,
} from "./converter";

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

describe(manifestToPayloadBlocks, () => {
  it("converts all sections in a theme manifest into namespaced blocks", () => {
    const manifest: ThemeManifestDefinition = {
      name: "Default Theme",
      slug: "default",
      version: "1.0.0",
      sections: [
        {
          name: "Hero Section",
          slug: "hero",
          settings: [
            {
              label: "Heading",
              name: "heading",
              type: "text",
            },
          ],
        },
        {
          name: "Banner Section",
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

    const [heroBlock, bannerBlock] = manifestToPayloadBlocks(manifest);

    expect(heroBlock).toMatchObject({
      labels: { plural: "Hero Section", singular: "Hero Section" },
      slug: "default_hero",
      fields: expect.arrayContaining([
        expect.objectContaining({ type: "text" }),
      ]),
    });
    expect(bannerBlock).toMatchObject({
      labels: { plural: "Banner Section", singular: "Banner Section" },
      slug: "default_banner",
    });
  });

  it("converts child block definitions within sections into child blocks on the section block", () => {
    const manifest: ThemeManifestDefinition = {
      name: "Modern Theme",
      slug: "modern",
      version: "1.0.0",
      sections: [
        {
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
        },
      ],
    };

    const [block] = manifestToPayloadBlocks(manifest);
    expect(block.slug).toBe("modern_features");

    // SAFETY: Section block contains blocks field as defined in section definition.
    const blocksField = block.fields.find(
      (f: Field) => "name" in f && f.name === "blocks"
    ) as BlocksField | undefined;
    const [childBlock] = blocksField?.blocks ?? [];
    expect(childBlock).toMatchObject({
      slug: "feature_item",
    });
    expect(childBlock?.fields).toHaveLength(2);
  });
});
