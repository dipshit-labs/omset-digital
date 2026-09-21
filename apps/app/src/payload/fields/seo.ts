import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from "@payloadcms/plugin-seo/fields";
import type { CollapsibleField } from "payload";

// TODO: Improve this fields
// TODO: Add generator function
const seoField = (): CollapsibleField => ({
  label: "Search engine listing",
  type: "collapsible",
  admin: {
    initCollapsed: true,
  },
  fields: [
    {
      label: false,
      name: "meta",
      type: "group",
      fields: [
        MetaTitleField({}),
        MetaDescriptionField({}),
        MetaImageField({
          relationTo: "media",
        }),

        PreviewField({
          descriptionPath: "meta.description",
          titlePath: "meta.title",
        }),
        OverviewField({
          descriptionPath: "meta.description",
          imagePath: "meta.image",
          titlePath: "meta.title",
        }),
      ],
    },
  ],
});

export { seoField };
