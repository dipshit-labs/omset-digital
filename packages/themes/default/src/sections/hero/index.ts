import type { HeroBulletBlock, HeroSettings } from "./Hero";
import type { SettingField } from "@repo/theme-core";

import { defineSection } from "@repo/theme-core";
import { Hero } from "./Hero";

export { Hero } from "./Hero";
export type { HeroBulletBlock, HeroSettings } from "./Hero";
export { HeroCtaClient } from "./HeroCtaClient";
export type { HeroCtaClientProps } from "./HeroCtaClient";

export const heroSettings: SettingField[] = [
  {
    name: "heading",
    type: "text",
    label: "Heading",
    required: true,
  },
  {
    name: "subheading",
    type: "textarea",
    label: "Subheading",
  },
  {
    name: "alignment",
    type: "select",
    defaultValue: "center",
    label: "Alignment",
    options: [
      { label: "Center", value: "center" },
      { label: "Left", value: "left" },
    ],
  },
  {
    name: "cta",
    type: "group",
    label: "Call to Action",
    fields: [
      { name: "label", type: "text", label: "Label" },
      { name: "url", type: "text", label: "URL", required: true },
      { name: "newTab", type: "toggle", label: "Open in new tab" },
    ],
  },
];

export const heroSection = defineSection<HeroSettings, HeroBulletBlock>({
  name: "Hero",
  category: "Hero",
  Component: Hero,
  description: "Prominent banner section at the top of the page",
  settings: heroSettings,
  slug: "hero",
  blocks: [
    {
      slug: "bullet",
      fields: [
        {
          name: "text",
          type: "text",
          label: "Text",
          required: true,
        },
        {
          name: "icon",
          type: "select",
          defaultValue: "check",
          label: "Icon",
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
