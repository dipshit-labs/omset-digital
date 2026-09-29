import { describe, expect, it } from "vitest";

import * as PrimitivesExports from "./exports/primitives";
import * as TypesExports from "./exports/types";
import * as UtilsExports from "./exports/utils";
import * as RootExports from "./index";

describe("@repo/theme-core public export entry points", () => {
  it("exports theme engine and manifest mapper from root", () => {
    expect(RootExports.evaluateThemeCssVars).toBeDefined();
    expect(RootExports.toClientThemeManifest).toBeDefined();
  });

  it("exports DSL creators and base tokens from root", () => {
    expect(RootExports.defineTheme).toBeDefined();
    expect(RootExports.defineSection).toBeDefined();
    expect(RootExports.DEFAULT_THEME_TOKENS).toBeDefined();
  });

  it("exports fixed and semantic token dictionaries from root", () => {
    expect(RootExports.FIXED_THEME_TOKENS).toBeDefined();
    expect(RootExports.SEMANTIC_THEME_TOKENS).toBeDefined();
    expect(RootExports.SEMANTIC_THEME_VARIABLES).toBeDefined();
  });

  it("exports class merger and section renderer from utils", () => {
    expect(UtilsExports.cn).toBeDefined();
    expect(UtilsExports.renderThemeSections).toBeDefined();
  });

  it("exports brand ramp and neutral derivation utilities from utils subpath", () => {
    expect(UtilsExports.deriveBrandRamp).toBeDefined();
    expect(UtilsExports.deriveNeutralTokens).toBeDefined();
    expect(UtilsExports.getAccessibleForeground).toBeDefined();
  });

  it("exports color conversion and parsing utilities from utils subpath", () => {
    expect(UtilsExports.ensureSrgb).toBeDefined();
    expect(UtilsExports.formatOklch).toBeDefined();
    expect(UtilsExports.parseOklch).toBeDefined();
  });

  it("exports DSL creators from types", () => {
    expect(TypesExports.defineTheme).toBeDefined();
    expect(TypesExports.defineSection).toBeDefined();
  });

  it("exports accessible primitives and hides internals from primitives", () => {
    expect(PrimitivesExports.Button).toBeDefined();
    expect(PrimitivesExports.Dialog).toBeDefined();
    expect(PrimitivesExports.Sheet).toBeDefined();
    expect(PrimitivesExports.Input).toBeDefined();
    expect(PrimitivesExports.Accordion).toBeDefined();
  });

  it("hides internal environment adapter from primitives", () => {
    expect(Reflect.has(PrimitivesExports, "isNextJsEnvironment")).toBeFalsy();
  });
});
