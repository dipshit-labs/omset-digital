import type { HeroSettings, HeroTagBlock } from "./Hero";
import type { SettingField } from "@repo/theme-core";

import { defineSection } from "@repo/theme-core";
import { Hero } from "./Hero";

export { Hero } from "./Hero";
export type { HeroSettings, HeroTagBlock } from "./Hero";
export { HeroCtaClient } from "./HeroCtaClient";
export type { HeroCtaClientProps } from "./HeroCtaClient";

export const heroSettings: SettingField[] = [
  {
    name: "eyebrow",
    type: "text",
    label: "Eyebrow",
  },
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
    name: "cta",
    type: "group",
    label: "Call to Action",
    fields: [
      {
        name: "label",
        type: "text",
        defaultValue: "Explore",
        label: "Button Label",
      },
      {
        name: "url",
        type: "text",
        defaultValue: "/products",
        label: "Target URL",
      },
      {
        name: "newTab",
        type: "toggle",
        defaultValue: false,
        label: "Open in new tab",
      },
    ],
  },
];

export const heroSection = defineSection<HeroSettings, HeroTagBlock>({
  name: "Minimal Hero",
  Component: Hero,
  description: "Minimal typography-focused hero section with optional tags",
  settings: heroSettings,
  slug: "hero",
  blocks: [
    {
      slug: "tag",
      fields: [
        {
          name: "label",
          type: "text",
          label: "Tag Label",
          required: true,
        },
      ],
      labels: {
        plural: "Tags",
        singular: "Tag",
      },
    },
  ],
  presets: [
    {
      name: "Default Minimal Hero",
      settings: {
        eyebrow: "Selected Works",
        heading: "Essential Essentials",
        subheading: "Thoughtfully curated items designed for mindful living.",
        cta: {
          label: "Shop Collection",
          newTab: false,
          url: "/products",
        },
      },
    },
  ],
});
