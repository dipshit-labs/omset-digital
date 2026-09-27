// oxlint-disable shadcn/no-inline-styles
import { renderThemeSections } from "@repo/payload-plugin-themes/utilities";
import type { CSSProperties, ReactElement } from "react";

import type { StorefrontContext } from "@/lib/storefront";

export interface StorefrontCanvasProps {
  context: StorefrontContext;
}

export const StorefrontCanvas = ({
  context,
}: StorefrontCanvasProps): ReactElement => {
  const { manifest, sections, themeCssVars } = context;
  const renderedSections = renderThemeSections(manifest, sections);
  // SAFETY: ThemeCssVars maps canonical theme variables as valid CSS custom properties on the root style attribute.
  const style = themeCssVars as CSSProperties;

  return (
    <div className="bg-background text-foreground min-h-screen" style={style}>
      <div className="flex w-full flex-col">{renderedSections}</div>
    </div>
  );
};
