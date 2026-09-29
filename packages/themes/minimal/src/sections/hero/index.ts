import { defineSection } from "@repo/theme-core";
import type { SettingField } from "@repo/theme-core";

import { Hero } from "./Hero";
import type { HeroSettings, HeroTagBlock } from "./Hero";

export { Hero } from "./Hero";
export type { HeroSettings, HeroTagBlock } from "./Hero";
export { HeroCtaClient } from "./HeroCtaClient";
export type { HeroCtaClientProps } from "./HeroCtaClient";

export const heroSettings: SettingField[] = [
  {
    label: "Eyebrow",
    name: "eyebrow",
    type: "text",
  },
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
    label: "Call to Action",
    name: "cta",
    type: "group",
    fields: [
      {
        defaultValue: "Explore",
        label: "Button Label",
        name: "label",
        type: "text",
      },
      {
        defaultValue: "/products",
        label: "Target URL",
        name: "url",
        type: "text",
      },
      {
        defaultValue: false,
        label: "Open in new tab",
        name: "newTab",
        type: "toggle",
      },
    ],
  },
];

export const heroSection = defineSection<HeroSettings, HeroTagBlock>({
  Component: Hero,
  description: "Minimal typography-focused hero section with optional tags",
  name: "Minimal Hero",
  settings: heroSettings,
  slug: "hero",
  blocks: [
    {
      slug: "tag",
      fields: [
        {
          label: "Tag Label",
          name: "label",
          required: true,
          type: "text",
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
