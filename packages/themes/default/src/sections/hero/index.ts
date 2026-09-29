import { defineSection } from "@repo/theme-core";
import type { SettingField } from "@repo/theme-core";

import { Hero } from "./Hero";
import type { HeroBulletBlock, HeroSettings } from "./Hero";

export { Hero } from "./Hero";
export type { HeroBulletBlock, HeroSettings } from "./Hero";
export { HeroCtaClient } from "./HeroCtaClient";
export type { HeroCtaClientProps } from "./HeroCtaClient";

export const heroSettings: SettingField[] = [
  {
    label: "Heading",
    name: "heading",
    required: true,
    type: "text",
  },
  {
    label: "Subheading",
    name: "subheading",
    type: "textarea",
  },
  {
    defaultValue: "center",
    label: "Alignment",
    name: "alignment",
    type: "select",
    options: [
      { label: "Center", value: "center" },
      { label: "Left", value: "left" },
    ],
  },
  {
    label: "Call to Action",
    name: "cta",
    type: "group",
    fields: [
      { label: "Label", name: "label", type: "text" },
      { label: "URL", name: "url", required: true, type: "text" },
      { label: "Open in new tab", name: "newTab", type: "toggle" },
    ],
  },
];

export const heroSection = defineSection<HeroSettings, HeroBulletBlock>({
  category: "Hero",
  Component: Hero,
  description: "Prominent banner section at the top of the page",
  name: "Hero",
  settings: heroSettings,
  slug: "hero",
  blocks: [
    {
      slug: "bullet",
      fields: [
        {
          label: "Text",
          name: "text",
          required: true,
          type: "text",
        },
        {
          defaultValue: "check",
          label: "Icon",
          name: "icon",
          type: "select",
          options: [
            { label: "Check", value: "check" },
            { label: "Star", value: "star" },
            { label: "Heart", value: "heart" },
          ],
        },
      ],
      labels: {
        plural: "Bullet Points",
        singular: "Bullet Point",
      },
    },
  ],
  presets: [
    {
      name: "Default Hero",
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
      settings: {
        alignment: "center",
        heading: "Empower Your Business",
        subheading: "Discover high-quality products curated just for you.",
        cta: {
          label: "Shop Now",
          newTab: false,
          url: "/products",
        },
      },
    },
  ],
});
