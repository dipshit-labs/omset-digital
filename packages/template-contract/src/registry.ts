import type React from "react";
import type { TemplateTokens } from "./tokens";

export type BaseSectionType =
  | "hero"
  | "product-grid"
  | "about"
  | "testimonials"
  | "contact"
  | "blog-preview";

export type SectionType = BaseSectionType | (string & {});

export interface HeroSectionData {
  banner?: unknown;
  ctaText?: string;
  ctaUrl?: string;
  headline: string;
  subheadline?: string;
}

export interface ProductGridSectionData {
  showFeaturedOnly: boolean;
  title?: string;
}

export interface AboutSectionData {
  image?: unknown;
  richText?: unknown;
}

export interface TestimonialItem {
  avatar?: unknown;
  name: string;
  quote: string;
}

export interface TestimonialsSectionData {
  items: TestimonialItem[];
}

export interface ContactSectionData {
  showForm: boolean;
  whatsappButton: boolean;
}

export interface BlogPreviewSectionData {
  postCount: number;
  title?: string;
}

export type SectionData =
  | HeroSectionData
  | ProductGridSectionData
  | AboutSectionData
  | TestimonialsSectionData
  | ContactSectionData
  | BlogPreviewSectionData
  | Record<string, unknown>;

export interface SectionProps<TData = unknown> {
  data: TData;
  id?: string;
  tokens: TemplateTokens;
}

export type SectionComponent<TData = unknown> = React.ComponentType<
  SectionProps<TData>
>;

export type SectionRegistry = Record<string, SectionComponent<unknown>>;

export interface SectionConfig<TData = SectionData> {
  data: TData;
  enabled: boolean;
  id?: string;
  order: number;
  type: SectionType;
}

export function filterAndSortSections<TData = SectionData>(
  sections: SectionConfig<TData>[]
): SectionConfig<TData>[] {
  return sections
    .filter((section) => section.enabled)
    .sort((a, b) => a.order - b.order);
}
