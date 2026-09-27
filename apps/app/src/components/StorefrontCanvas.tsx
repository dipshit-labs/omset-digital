// oxlint-disable shadcn/no-inline-styles
import type {
  AnySectionDefinition,
  SectionProps,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "@repo/payload-plugin-themes/types";
import type { CSSProperties, ReactElement } from "react";

import type { StorefrontContext } from "@/lib/storefront";

export interface StorefrontCanvasProps {
  context: StorefrontContext;
}

const findSectionDefinition = (
  manifest: ThemeManifestDefinition,
  sectionSlug: string
): AnySectionDefinition | undefined => {
  const sectionsList = Array.isArray(manifest.sections)
    ? manifest.sections
    : Object.values(manifest.sections);

  return sectionsList.find((section) => section.slug === sectionSlug);
};

export const StorefrontCanvas = ({
  context,
}: StorefrontCanvasProps): ReactElement => {
  const { manifest, sections, themeCssVars } = context;
  const prefix = `${manifest.slug}_`;

  const renderedSections: ReactElement[] = [];

  for (const [index, section] of sections.entries()) {
    if (!section.blockType.startsWith(prefix)) {
      continue;
    }

    const sectionSlug = section.blockType.slice(prefix.length);
    const sectionDef = findSectionDefinition(manifest, sectionSlug);
    if (!sectionDef?.Component) {
      continue;
    }

    const {
      blocks,
      blockType,
      id,
      settings: explicitSettings,
      ...flatSettings
    } = section;

    const hasExplicitSettings =
      explicitSettings &&
      typeof explicitSettings === "object" &&
      Object.keys(explicitSettings).length > 0;

    // SAFETY: Non-block properties on the template section document correspond to the section settings schema.
    const settings = (
      hasExplicitSettings ? explicitSettings : flatSettings
    ) as ThemeSettingsRecord;

    // SAFETY: Theme section definitions implement the theme DSL Component contract taking SectionProps.
    const Component = sectionDef.Component as (
      props: SectionProps
    ) => ReactElement | null;

    const normalizedId = typeof id === "string" ? id : undefined;
    const sectionKey =
      typeof id === "string" || typeof id === "number"
        ? id
        : `${blockType}-${index}`;

    renderedSections.push(
      <Component
        blockType={blockType}
        blocks={blocks}
        id={normalizedId}
        key={sectionKey}
        settings={settings}
      />
    );
  }

  // SAFETY: ThemeCssVars maps canonical theme variables as valid CSS custom properties on the root style attribute.
  const style = themeCssVars as CSSProperties;

  return (
    <div className="bg-background text-foreground min-h-screen" style={style}>
      <div className="flex w-full flex-col">{renderedSections}</div>
    </div>
  );
};
