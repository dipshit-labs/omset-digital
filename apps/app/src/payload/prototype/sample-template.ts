import type { SectionDefinition, ThemeManifestDefinition } from "./dsl";

export const heroSection: SectionDefinition = {
  description:
    "Prominent top-of-page section with headline, CTA, and optional image.",
  name: "Hero Banner",
  slug: "hero",
  blocks: {
    feature_bullet: {
      name: "Feature Bullet",
      slug: "feature_bullet",
      fields: {
        description: { label: "Short Description", type: "text" },
        title: { label: "Feature Title", required: true, type: "text" },
      },
    },
  },
  settings: {
    badgeText: {
      defaultValue: "New Collection Available",
      label: "Badge Text",
      type: "text",
    },
    heading: {
      defaultValue: "Crafted for Indonesian Creators",
      label: "Main Heading",
      required: true,
      type: "text",
    },
    image: {
      label: "Hero Image",
      relationTo: "media",
      type: "upload",
    },
    primaryCta: {
      label: "Primary Button",
      type: "link",
    },
    showBadge: {
      defaultValue: true,
      label: "Show Announcement Badge",
      type: "toggle",
    },
    subheading: {
      defaultValue: "Discover high quality goods from independent merchants.",
      label: "Subheading / Tagline",
      type: "textarea",
    },
    variant: {
      defaultValue: "centered",
      label: "Layout Variant",
      type: "select",
      options: [
        { label: "Centered Text", value: "centered" },
        { label: "Split (Text & Image)", value: "split" },
        { label: "Full Width Banner", value: "banner" },
      ],
    },
  },
};

export const featuredProductsSection: SectionDefinition = {
  description:
    "Display curated catalog items with pricing and add-to-cart buttons.",
  name: "Featured Products Grid",
  slug: "featured_products",
  settings: {
    columns: {
      defaultValue: "3",
      label: "Grid Columns",
      type: "select",
      options: [
        { label: "2 Columns", value: "2" },
        { label: "3 Columns", value: "3" },
        { label: "4 Columns", value: "4" },
      ],
    },
    heading: {
      defaultValue: "Trending This Week",
      label: "Section Title",
      required: true,
      type: "text",
    },
    limit: {
      defaultValue: 6,
      label: "Maximum Products",
      max: 24,
      min: 1,
      type: "number",
    },
    showAddToCart: {
      defaultValue: true,
      label: "Show Direct Add to Cart",
      type: "toggle",
    },
  },
};

export const defaultTemplateManifest: ThemeManifestDefinition = {
  description:
    "A clean, high-conversion template designed for modern retail storefronts.",
  name: "Modern Clean (Default)",
  slug: "default",
  cssVars: (settings) => ({
    "--color-bg": String(settings.backgroundColor ?? "#ffffff"),
    "--color-primary": String(settings.primaryColor ?? "#0f172a"),
    "--color-secondary": String(settings.secondaryColor ?? "#3b82f6"),
    "--font-heading": String(settings.headingFont ?? "inter"),
    "--max-width": `${settings.containerMaxWidth ?? "1280"}px`,
  }),
  pagePresets: {
    home: {
      slug: "home",
      templateType: "home",
      title: "Home",
      sections: [
        {
          sectionSlug: "hero",
          blocks: [
            {
              blockSlug: "feature_bullet",
              data: {
                description: "Shipped nationwide with RajaOngkir integration.",
                title: "Instant Shipping",
              },
            },
          ],
          settings: {
            badgeText: "New Collection Available",
            heading: "Crafted for Indonesian Creators",
            showBadge: true,
            subheading:
              "Discover high quality goods from independent merchants.",
            variant: "centered",
          },
        },
        {
          sectionSlug: "featured_products",
          settings: {
            columns: "3",
            heading: "Trending This Week",
            limit: 6,
            showAddToCart: true,
          },
        },
      ],
    },
  },
  sections: {
    featured_products: featuredProductsSection,
    hero: heroSection,
  },
  settings: {
    backgroundColor: {
      defaultValue: "#ffffff",
      label: "Page Background",
      type: "color",
    },
    containerMaxWidth: {
      defaultValue: "1280",
      label: "Page Container Width",
      type: "select",
      options: [
        { label: "1140px (Compact)", value: "1140" },
        { label: "1280px (Standard)", value: "1280" },
        { label: "1440px (Wide)", value: "1440" },
      ],
    },
    headingFont: {
      defaultValue: "inter",
      label: "Heading Font",
      type: "select",
      options: [
        { label: "Inter (Modern Sans)", value: "inter" },
        { label: "Playfair Display (Editorial Serif)", value: "playfair" },
        { label: "Plus Jakarta Sans (Friendly)", value: "jakarta" },
      ],
    },
    primaryColor: {
      defaultValue: "#0f172a",
      label: "Primary Accent Color",
      type: "color",
    },
    secondaryColor: {
      defaultValue: "#3b82f6",
      label: "Secondary Color",
      type: "color",
    },
  },
};
