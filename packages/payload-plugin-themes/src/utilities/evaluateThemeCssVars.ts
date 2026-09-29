import { evaluateThemeCssVars as coreEvaluateThemeCssVars } from "@repo/theme-core";
import type {
  EvaluateThemeCssVarsOptions,
  ThemeCssVars,
} from "@repo/theme-core";

export {
  evaluateFieldCssValue,
  type EvaluateThemeCssVarsOptions,
} from "@repo/theme-core";

export const evaluateThemeCssVars = (
  options: EvaluateThemeCssVarsOptions = {}
): ThemeCssVars =>
  coreEvaluateThemeCssVars({
    ...options,
    baseTokens: options.baseTokens ?? {},
  });
