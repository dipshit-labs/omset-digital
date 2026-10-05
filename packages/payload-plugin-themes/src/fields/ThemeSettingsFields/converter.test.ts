import type { ArrayField, BlocksField, Field, GroupField } from "payload";
import type { SettingField, ThemeManifestDefinition } from "@repo/theme-core";

import { describe, expect, it } from "vitest";

import {
  manifestToPayloadBlocks,
  settingFieldToPayloadField,
} from "./converter";

describe(settingFieldToPayloadField, () => {
  it("converts text field correctly", () => {
    const field: SettingField = {
      name: "heading",
      type: "text",
      admin: { description: "Main headline" },
      defaultValue: "Welcome",
      label: "Heading",
      placeholder: "Enter title",
      required: true,
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      name: "heading",
      type: "text",
      defaultValue: "Welcome",
      label: "Heading",
      required: true,
      admin: {
        description: "Main headline",
        placeholder: "Enter title",
      },
    });
  });

  it("converts toggle field to checkbox", () => {
    const field: SettingField = {
      name: "showBadge",
      type: "toggle",
      defaultValue: true,
      label: "Show Badge",
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      name: "showBadge",
      type: "checkbox",
      defaultValue: true,
      label: "Show Badge",
      admin: {
        description: undefined,
      },
    });
  });

  it("converts select field with options", () => {
    const field: SettingField = {
      name: "alignment",
      type: "select",
      defaultValue: "left",
      label: "Alignment",
      required: true,
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
      ],
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      name: "alignment",
      type: "select",
      defaultValue: "left",
      label: "Alignment",
      required: true,
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
      name: "image",
      type: "upload",
      label: "Image",
    };

    const payloadField = settingFieldToPayloadField(field);

    expect(payloadField).toStrictEqual({
      name: "image",
      type: "upload",
      label: "Image",
      relationTo: "media",
      required: undefined,
      admin: {
        description: undefined,
      },
    });
  });

  it("converts link field to structured group", () => {
    const field: SettingField = {
      name: "cta",
      type: "link",
      label: "Call to Action",
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
      name: "slides",
      type: "array",
      label: "Slides",
      maxRows: 5,
      minRows: 1,
      fields: [
        {
          name: "title",
          type: "text",
          label: "Slide Title",
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
              name: "heading",
              type: "text",
              label: "Heading",
            },
          ],
        },
        {
          name: "Banner Section",
          slug: "banner",
          settings: [
            {
              name: "text",
              type: "text",
              label: "Text",
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
                  name: "title",
                  type: "text",
                  label: "Feature Title",
                },
                {
                  name: "description",
                  type: "textarea",
                  label: "Description",
                },
              ],
            },
          ],
          settings: [
            {
              name: "title",
              type: "text",
              label: "Title",
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
