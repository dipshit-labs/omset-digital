export interface ThemeLivePreviewDataMessage<T = unknown> {
  data: T;
  type: "payload-live-preview";
}

export interface ThemeDocumentEventMessage {
  collectionSlug?: string;
  doc?: Record<string, boolean | number | string | null>;
  event?: string;
  id?: number | string;
  type: "payload-document-event";
}

export type ThemePreviewMessage<T = unknown> =
  | ThemeLivePreviewDataMessage<T>
  | ThemeDocumentEventMessage;

export const isThemePreviewMessage = (
  event: MessageEvent
): event is MessageEvent<ThemePreviewMessage> =>
  typeof event.data === "object" &&
  event.data !== null &&
  "type" in event.data &&
  (event.data.type === "payload-live-preview" ||
    event.data.type === "payload-document-event");

export const isThemeDocumentEventMessage = (
  event: MessageEvent
): event is MessageEvent<ThemeDocumentEventMessage> =>
  typeof event.data === "object" &&
  event.data !== null &&
  "type" in event.data &&
  event.data.type === "payload-document-event";
