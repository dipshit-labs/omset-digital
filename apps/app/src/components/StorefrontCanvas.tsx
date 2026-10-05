// oxlint-disable shadcn/no-inline-styles

import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { StorefrontContext } from "@/lib/storefront";

import { renderThemeSections } from "@repo/theme-core/utils";

export interface StorefrontCanvasProps {
  children?: ReactNode;
  context: StorefrontContext;
}

export const StorefrontCanvas = ({
  children,
  context,
}: StorefrontCanvasProps): ReactElement => {
  const { manifest, sections, themeCssVars } = context;
  const renderedSections = renderThemeSections(manifest, sections);
  // SAFETY: ThemeCssVars maps canonical theme variables as valid CSS custom properties on the root style attribute.
  const style = themeCssVars as CSSProperties;

  return (
    <div className="bg-background text-foreground min-h-screen" style={style}>
      <div className="flex w-full flex-col">
        {renderedSections}
        {children}
      </div>
    </div>
  );
};
