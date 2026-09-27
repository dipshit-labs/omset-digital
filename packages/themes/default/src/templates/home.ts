import type { TemplatePresetDefinition } from "@repo/payload-plugin-themes/types";

export const homeTemplate: TemplatePresetDefinition = {
  name: "Home",
  type: "home",
  sections: [
    {
      alignment: "center",
      blockType: "hero",
      heading: "Empower Your Business",
      subheading: "Discover high-quality products curated just for you.",
      blocks: [
        {
          blockType: "bullet",
          icon: "check",
          text: "Verified Indonesian Merchants",
        },
        {
          blockType: "bullet",
          icon: "check",
          text: "Instant WhatsApp Support",
        },
      ],
      cta: {
        label: "Shop Now",
        newTab: false,
        url: "/products",
      },
    },
  ],
};

export { homeTemplate as homePreset };
