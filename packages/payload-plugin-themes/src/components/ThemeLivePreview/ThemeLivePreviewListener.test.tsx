import type { ThemeManifestDefinition } from "@repo/theme-core";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeLivePreviewListener } from "./ThemeLivePreviewListener";

const mockManifest: ThemeManifestDefinition = {
  name: "Listener Test Theme",
  sections: [],
  slug: "listener-test",
  version: "1.0.0",
  settings: [
    {
      cssVar: "--color-primary",
      defaultValue: "#111111",
      label: "Primary Color",
      name: "primaryColor",
      type: "color",
    },
  ],
};

describe(ThemeLivePreviewListener, () => {
  const originalParent = window.parent;

  beforeEach(() => {
    document.documentElement.removeAttribute("style");
  });

  afterEach(() => {
    window.parent = originalParent;
    vi.restoreAllMocks();
  });

  it("sends ready handshake to window.parent upon mount", () => {
    const postMessageSpy = vi.fn<() => void>();
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    const { unmount } = render(
      <ThemeLivePreviewListener serverURL="http://localhost:3000" />
    );

    expect(postMessageSpy).toHaveBeenCalledWith(
      { ready: true, type: "payload-live-preview" },
      "http://localhost:3000"
    );

    unmount();
  });

  it("invokes refresh callback when payload-document-event message arrives", () => {
    const refreshSpy = vi.fn<() => void>();
    const onDocumentEventSpy = vi.fn<() => void>();

    const { unmount } = render(
      <ThemeLivePreviewListener
        onDocumentEvent={onDocumentEventSpy}
        refresh={refreshSpy}
        serverURL="http://localhost:3000"
      />
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          event: "save",
          type: "payload-document-event",
        },
      })
    );

    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(onDocumentEventSpy).toHaveBeenCalledOnce();

    unmount();
  });

  it("supports router prop with refresh method", () => {
    const refreshSpy = vi.fn<() => void>();

    const { unmount } = render(
      <ThemeLivePreviewListener
        router={{ refresh: refreshSpy }}
        serverURL="http://localhost:3000"
      />
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          type: "payload-document-event",
        },
      })
    );

    expect(refreshSpy).toHaveBeenCalledOnce();

    unmount();
  });

  it("updates root CSS custom properties immediately on keystroke payload-live-preview without full reload", () => {
    const { unmount } = render(
      <ThemeLivePreviewListener
        applyToRoot
        manifest={mockManifest}
        serverURL="http://localhost:3000"
      />
    );

    expect(
      document.documentElement.style.getPropertyValue("--color-primary")
    ).toBe("#111111");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          type: "payload-live-preview",
          data: {
            settings: {
              primaryColor: "#00ffcc",
            },
          },
        },
      })
    );

    expect(
      document.documentElement.style.getPropertyValue("--color-primary")
    ).toBe("#00ffcc");

    unmount();
  });

  it("unsubscribes and stops listening when unmounted", () => {
    const refreshSpy = vi.fn<() => void>();

    const { unmount } = render(
      <ThemeLivePreviewListener
        refresh={refreshSpy}
        serverURL="http://localhost:3000"
      />
    );

    unmount();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          type: "payload-document-event",
        },
      })
    );

    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
