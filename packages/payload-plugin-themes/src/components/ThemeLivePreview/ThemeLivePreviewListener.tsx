"use client";

import type { ReactElement } from "react";
import type { ThemeDocumentEventMessage } from "../../utilities/isThemePreviewMessage";
import type { ThemeLivePreviewUpdate } from "./subscribe";
import type {
  ThemeClientManifest,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "@repo/theme-core";

import { useEffect } from "react";

import { subscribeThemeLivePreview } from "./subscribe";

export interface ThemeLivePreviewListenerProps {
  applyToRoot?: boolean;
  baseTokens?: Record<string, string>;
  initialSettings?: ThemeSettingsRecord;
  manifest?: ThemeClientManifest | ThemeManifestDefinition;
  onDocumentEvent?: (event: ThemeDocumentEventMessage) => void;
  onUpdate?: (update: ThemeLivePreviewUpdate) => void;
  refresh?: () => void;
  router?: { refresh: () => void };
  serverURL?: string;
}

export const ThemeLivePreviewListener = ({
  applyToRoot = true,
  baseTokens,
  initialSettings,
  manifest,
  onDocumentEvent,
  onUpdate,
  refresh,
  router,
  serverURL,
}: ThemeLivePreviewListenerProps): ReactElement | null => {
  useEffect(() => {
    const handleRefresh = (): void => {
      if (typeof refresh === "function") {
        refresh();
        return;
      }
      if (typeof router?.refresh === "function") {
        router.refresh();
      }
    };

    const unsubscribe = subscribeThemeLivePreview({
      applyToRoot,
      baseTokens,
      initialSettings,
      manifest,
      onDocumentEvent,
      onUpdate,
      refresh: handleRefresh,
      serverURL,
    });

    return () => {
      unsubscribe();
    };
  }, [
    applyToRoot,
    baseTokens,
    initialSettings,
    manifest,
    onDocumentEvent,
    onUpdate,
    refresh,
    router,
    serverURL,
  ]);

  return null;
};
