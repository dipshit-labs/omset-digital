// oxlint-disable shadcn/no-inline-styles
"use client";

import { cn } from "@repo/ui/lib/utils";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type {
  TemplateSectionInstance,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "../../types";
import { renderThemeSections } from "../../utilities/renderThemeSections";
import { useThemeLivePreview } from "./useThemeLivePreview";

export interface ThemeLivePreviewRenderProps {
  isLive: boolean;
  sections: TemplateSectionInstance[];
  settings: ThemeSettingsRecord;
  style: CSSProperties;
  themeCssVars: Record<string, string>;
}

export interface ThemeLivePreviewContext {
  manifest: ThemeManifestDefinition;
  sections?: TemplateSectionInstance[];
  settings?: ThemeSettingsRecord;
  themeCssVars?: Record<string, string>;
}

export interface ThemeLivePreviewProps {
  applyToRoot?: boolean;
  baseTokens?: Record<string, string>;
  children?: ReactNode | ((props: ThemeLivePreviewRenderProps) => ReactNode);
  className?: string;
  context?: ThemeLivePreviewContext;
  initialSections?: TemplateSectionInstance[];
  initialSettings?: ThemeSettingsRecord;
  initialTemplate?: { sections?: TemplateSectionInstance[] | null } | null;
  initialTheme?: { settings?: ThemeSettingsRecord | null } | null;
  manifest?: ThemeManifestDefinition;
  serverURL?: string;
  style?: CSSProperties;
}

export const ThemeLivePreviewClient = ({
  applyToRoot,
  baseTokens,
  children,
  className,
  context,
  initialSections,
  initialSettings,
  initialTemplate,
  initialTheme,
  manifest: propManifest,
  serverURL,
  style: customStyle,
}: ThemeLivePreviewProps): ReactElement => {
  const manifest = propManifest ?? context?.manifest;
  if (!manifest) {
    throw new Error(
      "ThemeLivePreview requires a valid manifest passed either directly or via context."
    );
  }

  const {
    isLive,
    sections,
    settings,
    style: computedStyle,
    themeCssVars,
  } = useThemeLivePreview({
    applyToRoot,
    baseTokens,
    initialSections: initialSections ?? context?.sections,
    initialSettings: initialSettings ?? context?.settings,
    initialTemplate,
    initialTheme,
    manifest,
    serverURL,
  });

  const combinedStyle: CSSProperties = {
    ...context?.themeCssVars,
    ...computedStyle,
    ...customStyle,
  };

  let content: ReactNode;

  if (typeof children === "function") {
    content = children({
      isLive,
      sections,
      settings,
      style: combinedStyle,
      themeCssVars,
    });
  } else if (children !== undefined && children !== null) {
    content = children;
  } else {
    content = (
      <div className="flex w-full flex-col">
        {renderThemeSections(manifest, sections)}
      </div>
    );
  }

  return (
    <div
      className={cn("bg-background text-foreground min-h-screen", className)}
      data-live-preview={isLive ? "active" : "inactive"}
      style={combinedStyle}
    >
      {content}
    </div>
  );
};

export const ThemeLivePreview = ThemeLivePreviewClient;
