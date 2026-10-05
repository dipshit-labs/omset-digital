export interface ReadyOptions {
  serverURL?: string;
}

export const ready = (options?: ReadyOptions): void => {
  if (typeof window === "undefined") {
    return;
  }

  const targetWindow: Window | null =
    window.opener ?? (window.parent === window ? null : window.parent);
  if (!targetWindow) {
    return;
  }

  targetWindow.postMessage(
    {
      type: "payload-live-preview",
      ready: true,
    },
    options?.serverURL ?? "*"
  );
};
