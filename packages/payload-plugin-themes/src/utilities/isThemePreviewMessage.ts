export interface ThemePreviewMessage<T = unknown> {
  data: T;
  type: "payload-live-preview";
}

// FIXME: This can be moved to ThemeLivePreview when #37 get implemented(?)
export const isThemePreviewMessage = (
  event: MessageEvent
): event is MessageEvent<ThemePreviewMessage> =>
  typeof event.data === "object" &&
  event.data !== null &&
  "type" in event.data &&
  event.data.type === "payload-live-preview";
