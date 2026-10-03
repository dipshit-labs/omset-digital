import { describe, expect, it } from "vitest";

import * as ClientExports from "./exports/client";
import * as FieldsExports from "./exports/fields";
import * as TypesExports from "./exports/types";
import * as UtilitiesExports from "./exports/utilities";
import * as RootExports from "./index";

describe("@repo/payload-plugin-themes public export entry points", () => {
  it("exports themesPlugin from root entry point", () => {
    expect(RootExports.themesPlugin).toBeDefined();
  });

  it("exports themeTemplateField from fields entry point", () => {
    expect(FieldsExports.themeTemplateField).toBeDefined();
  });

  it("exports preview listeners and helpers from client entry point", () => {
    expect(ClientExports.ThemeLivePreviewListener).toBeDefined();
    expect(ClientExports.subscribeThemeLivePreview).toBeDefined();
    expect(ClientExports.ready).toBeDefined();
  });

  it("retains plugin-specific utilities in utilities entry point", () => {
    expect(UtilitiesExports.generateThemePreviewPath).toBeDefined();
    expect(UtilitiesExports.isThemePreviewMessage).toBeDefined();
    expect(UtilitiesExports.resolveTenantStoreSlug).toBeDefined();
  });

  it("purges transitional shims from utilities entry point", () => {
    expect(Reflect.has(UtilitiesExports, "renderThemeSections")).toBeFalsy();
    expect(Reflect.has(UtilitiesExports, "evaluateThemeCssVars")).toBeFalsy();
    expect(Reflect.has(UtilitiesExports, "evaluateFieldCssValue")).toBeFalsy();
    expect(Reflect.has(UtilitiesExports, "toClientThemeManifest")).toBeFalsy();
  });

  it("purges theme-core DSL creators from types entry point", () => {
    expect(Reflect.has(TypesExports, "defineTheme")).toBeFalsy();
    expect(Reflect.has(TypesExports, "defineSection")).toBeFalsy();
  });
});
