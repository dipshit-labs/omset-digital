export interface ThemePreviewMessage<T = unknown> {
  data: T;
  type: "payload-live-preview";
}

export const isThemePreviewMessage = (
  event: MessageEvent
): event is MessageEvent<ThemePreviewMessage> =>
  typeof event.data === "object" &&
  event.data !== null &&
  "type" in event.data &&
  event.data.type === "payload-live-preview";
