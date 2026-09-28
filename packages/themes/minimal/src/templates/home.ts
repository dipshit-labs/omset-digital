import type { TemplatePresetDefinition } from "@repo/payload-plugin-themes/types";

export const homeTemplate: TemplatePresetDefinition = {
  name: "Home",
  type: "home",
  sections: [
    {
      blockType: "hero",
      eyebrow: "Selected Works",
      heading: "Essential Essentials",
      subheading: "Thoughtfully curated items designed for mindful living.",
      blocks: [
        {
          blockType: "tag",
          label: "Handcrafted",
        },
        {
          blockType: "tag",
          label: "Zero Waste",
        },
      ],
      cta: {
        label: "Shop Collection",
        newTab: false,
        url: "/products",
      },
    },
  ],
};

export { homeTemplate as homePreset };
