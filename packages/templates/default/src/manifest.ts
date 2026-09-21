import {
  type TemplateManifest,
  TemplateTokenSchema,
} from "@repo/template-contract";
import { z } from "zod";
import { defaultTokens } from "./tokens";

export const defaultSettingsSchema = z.object({
  heroLayout: z.enum(["centered", "split"]).default("centered"),
  productCardStyle: z
    .enum(["bordered", "flat", "elevated"])
    .default("bordered"),
  showTicker: z.boolean().default(false),
});

export type DefaultSettings = z.infer<typeof defaultSettingsSchema>;

export const manifest: TemplateManifest<DefaultSettings> = {
  defaultSections: ["hero", "product-grid", "about", "testimonials", "contact"],
  description:
    "Clean, modern multi-purpose storefront template tailored for Indonesian SMEs.",
  label: "Default",
  slug: "default",
  fonts: {
    body: "Geist Sans",
    heading: "Geist Sans",
  },
  supportedSections: [
    "hero",
    "product-grid",
    "about",
    "testimonials",
    "contact",
    "blog-preview",
  ],
  defaultTokens,
  settingsSchema: defaultSettingsSchema,
  tokenSchema: TemplateTokenSchema,
  defaultSettings: {
    heroLayout: "centered",
    productCardStyle: "bordered",
    showTicker: false,
  },
};
