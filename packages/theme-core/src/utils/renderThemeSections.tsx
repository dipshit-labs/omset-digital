import type { ReactElement } from "react";
import type {
  AnySectionDefinition,
  SectionProps,
  TemplateSectionInstance,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "../types";

const findSectionDefinition = (
  manifest: ThemeManifestDefinition,
  sectionSlug: string
): AnySectionDefinition | undefined => {
  const sectionsList = Array.isArray(manifest.sections)
    ? manifest.sections
    : Object.values(manifest.sections);

  return sectionsList.find((section) => section.slug === sectionSlug);
};

export const renderThemeSections = (
  manifest: ThemeManifestDefinition,
  sections: TemplateSectionInstance[]
): ReactElement[] => {
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
      explicitSettings !== undefined &&
      explicitSettings !== null &&
      typeof explicitSettings === "object";

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

  return renderedSections;
};
