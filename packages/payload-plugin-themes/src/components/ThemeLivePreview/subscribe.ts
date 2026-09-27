import type {
  TemplateSectionInstance,
  ThemeManifestDefinition,
  ThemeSettingsRecord,
} from "../../types";
import { evaluateThemeCssVars } from "../../utilities/evaluateThemeCssVars";
import { isThemePreviewMessage } from "../../utilities/isThemePreviewMessage";
import { ready } from "./ready";

export interface ThemeLivePreviewUpdate {
  data: unknown;
  sections: TemplateSectionInstance[];
  settings: ThemeSettingsRecord;
  themeCssVars: Record<string, string>;
}

export interface SubscribeThemeLivePreviewOptions {
  applyToRoot?: boolean;
  baseTokens?: Record<string, string>;
  initialSections?: TemplateSectionInstance[];
  initialSettings?: ThemeSettingsRecord;
  manifest: ThemeManifestDefinition;
  onUpdate: (update: ThemeLivePreviewUpdate) => void;
  serverURL?: string;
}

export type UnsubscribeThemeLivePreview = () => void;

interface LivePreviewDataRecord {
  sections?: TemplateSectionInstance[];
  settings?: ThemeSettingsRecord;
  theme?: {
    settings?: ThemeSettingsRecord;
  };
}

const NOOP_UNSUBSCRIBE: UnsubscribeThemeLivePreview = () => {
  // No-op for non-browser environments.
};

const extractSettings = (
  record: LivePreviewDataRecord
): ThemeSettingsRecord | undefined => {
  if (
    "settings" in record &&
    record.settings !== null &&
    typeof record.settings === "object"
  ) {
    return record.settings;
  }

  if (
    "theme" in record &&
    record.theme !== null &&
    typeof record.theme === "object" &&
    "settings" in record.theme &&
    record.theme.settings !== null &&
    typeof record.theme.settings === "object"
  ) {
    return record.theme.settings;
  }

  return undefined;
};

const applyCssVarsToRoot = (cssVars: Record<string, string>): void => {
  if (typeof document === "undefined" || !document.documentElement) {
    return;
  }

  for (const [key, value] of Object.entries(cssVars)) {
    document.documentElement.style.setProperty(key, value);
  }
};

export const subscribeThemeLivePreview = ({
  applyToRoot = true,
  baseTokens,
  initialSections,
  initialSettings,
  manifest,
  onUpdate,
  serverURL,
}: SubscribeThemeLivePreviewOptions): UnsubscribeThemeLivePreview => {
  if (typeof window === "undefined") {
    return NOOP_UNSUBSCRIBE;
  }

  let currentSettings = initialSettings ?? {};
  let currentSections = initialSections ?? [];
  let currentThemeCssVars = evaluateThemeCssVars({
    baseTokens,
    manifest,
    settings: currentSettings,
  });

  if (applyToRoot) {
    applyCssVarsToRoot(currentThemeCssVars);
  }

  const handleMessage = (event: MessageEvent): void => {
    if (!isThemePreviewMessage(event)) {
      return;
    }

    if (serverURL && event.origin !== serverURL) {
      return;
    }

    const payloadEvent = event.data;
    const incomingData = payloadEvent.data;

    if (!incomingData || typeof incomingData !== "object") {
      return;
    }

    let hasUpdate = false;

    if (Array.isArray(incomingData)) {
      // SAFETY: Direct section array payload satisfies TemplateSectionInstance contract.
      currentSections = incomingData as TemplateSectionInstance[];
      hasUpdate = true;
    } else {
      // SAFETY: Live preview sends raw document payloads; narrowed to LivePreviewDataRecord.
      const record = incomingData as LivePreviewDataRecord;

      // Case 1: Template document with sections
      if ("sections" in record && Array.isArray(record.sections)) {
        currentSections = record.sections;
        hasUpdate = true;
      }

      // Case 2: Theme settings (either root settings or nested theme.settings)
      const incomingSettings = extractSettings(record);
      if (incomingSettings) {
        currentSettings = incomingSettings;
        currentThemeCssVars = evaluateThemeCssVars({
          baseTokens,
          manifest,
          settings: currentSettings,
        });
        if (applyToRoot) {
          applyCssVarsToRoot(currentThemeCssVars);
        }
        hasUpdate = true;
      }
    }

    if (hasUpdate) {
      onUpdate({
        data: incomingData,
        sections: currentSections,
        settings: currentSettings,
        themeCssVars: currentThemeCssVars,
      });
    }
  };

  window.addEventListener("message", handleMessage);
  ready({ serverURL });

  return () => {
    window.removeEventListener("message", handleMessage);
  };
};
