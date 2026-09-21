import type {
  SectionComponent,
  SectionRegistry,
} from "@repo/template-contract";
import { AboutSection } from "./about";
import { BlogPreviewSection } from "./blog-preview";
import { ContactSection } from "./contact";
import { HeroSection } from "./hero";
import { ProductGridSection } from "./product-grid";
import { TestimonialsSection } from "./testimonials";

export const registry: SectionRegistry = {
  about: AboutSection as SectionComponent<unknown>,
  "blog-preview": BlogPreviewSection as SectionComponent<unknown>,
  contact: ContactSection as SectionComponent<unknown>,
  hero: HeroSection as SectionComponent<unknown>,
  "product-grid": ProductGridSection as SectionComponent<unknown>,
  testimonials: TestimonialsSection as SectionComponent<unknown>,
};

export * from "./about";
export * from "./blog-preview";
export * from "./contact";
export * from "./hero";
export * from "./product-grid";
export * from "./testimonials";
