import type { CollapsibleField } from "payload";

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from "@payloadcms/plugin-seo/fields";

// TODO: Improve this fields
// TODO: Add generator function
const seoField = (): CollapsibleField => ({
  type: "collapsible",
  label: "Search engine listing",
  admin: {
    initCollapsed: true,
  },
  fields: [
    {
      name: "meta",
      type: "group",
      label: false,
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
