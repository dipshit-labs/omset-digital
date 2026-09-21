import type { TemplatePackage } from "@repo/template-contract";
import { type DefaultSettings, manifest } from "./manifest";
import { registry } from "./sections/index";
import { tokensToCssVars } from "./tokens";

export const template: TemplatePackage<DefaultSettings> = {
  manifest,
  registry,
  tokensToCssVars,
};

export * from "./manifest";
export * from "./sections/index";
export * from "./tokens";
