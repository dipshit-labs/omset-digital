import { defineSection } from "@repo/payload-plugin-themes/types";
import type {
  SectionProps,
  SettingField,
} from "@repo/payload-plugin-themes/types";
import type { ReactElement } from "react";

export interface HeroSettings {
  alignment?: "center" | "left";
  cta?: {
    label?: string;
    newTab?: boolean;
    url?: string;
  };
  heading: string;
  subheading?: string;
}

export interface HeroBulletBlock {
  blockType: "bullet";
  icon?: string;
  text: string;
}

export const heroSettings: SettingField[] = [
  {
    defaultValue: "Empower Your Business",
    label: "Heading",
    name: "heading",
    required: true,
    type: "text",
  },
  {
    defaultValue: "Discover high-quality products curated just for you.",
    label: "Subheading",
    name: "subheading",
    type: "textarea",
  },
  {
    label: "Call to Action",
    name: "cta",
    type: "link",
    defaultValue: {
      label: "Shop Now",
      newTab: false,
      url: "/products",
    },
  },
  {
    defaultValue: "center",
    label: "Alignment",
    name: "alignment",
    type: "select",
    options: [
      { label: "Left", value: "left" },
      { label: "Center", value: "center" },
    ],
  },
];

export const Hero = ({
  blocks,
  settings,
}: SectionProps<HeroSettings, HeroBulletBlock>): ReactElement => {
  const isCentered = settings?.alignment === "center";

  return (
    <section
      className={`px-6 py-20 ${isCentered ? "text-center" : "text-left"}`}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          {settings?.heading || "Welcome"}
        </h1>
        {settings?.subheading && (
          <p className="text-muted-foreground text-lg sm:text-xl">
            {settings.subheading}
          </p>
        )}
        {settings?.cta?.url && (
          <div
            className={`pt-4 ${isCentered ? "flex justify-center" : "flex justify-start"}`}
          >
            <a
              className="bg-primary text-primary-foreground inline-flex items-center rounded-lg px-6 py-3 text-base font-medium shadow-sm hover:opacity-90"
              href={settings.cta.url}
              rel={settings.cta.newTab ? "noreferrer" : undefined}
              target={settings.cta.newTab ? "_blank" : undefined}
            >
              {settings.cta.label || "Learn More"}
            </a>
          </div>
        )}
        {blocks && blocks.length > 0 && (
          <ul
            className={`mt-8 flex flex-wrap gap-4 ${isCentered ? "justify-center" : "justify-start"}`}
          >
            {blocks.map((block, idx) => (
              <li
                className="text-muted-foreground flex items-center gap-2 text-sm"
                key={`${block.text}-${idx}`}
              >
                <span>✓</span>
                <span>{block.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

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
