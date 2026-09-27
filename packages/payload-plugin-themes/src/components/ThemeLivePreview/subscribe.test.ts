// @vitest-environment jsdom
import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TemplateSectionInstance,
  ThemeManifestDefinition,
} from "../../types";
import { isThemePreviewMessage } from "../../utilities/isThemePreviewMessage";
import { ready } from "./ready";
import { subscribeThemeLivePreview } from "./subscribe";
import type { ThemeLivePreviewUpdate } from "./subscribe";

const mockManifest: ThemeManifestDefinition = {
  name: "Mock Theme",
  sections: [],
  slug: "mock",
  version: "1.0.0",
  settings: [
    {
      cssVar: "--primary",
      defaultValue: "#000000",
      label: "Primary Color",
      name: "primaryColor",
      type: "color",
    },
    {
      cssVar: "--font-size",
      defaultValue: 16,
      label: "Font Size",
      name: "fontSize",
      type: "number",
      unit: "px",
    },
  ],
};

describe(ready, () => {
  it("sends payload-live-preview ready message to window.parent", () => {
    const postMessageSpy = vi.fn<() => void>();
    const originalParent = window.parent;
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    ready({ serverURL: "http://localhost:3000" });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        ready: true,
        type: "payload-live-preview",
      },
      "http://localhost:3000"
    );

    Object.defineProperty(window, "parent", {
      configurable: true,
      value: originalParent,
      writable: true,
    });
  });

  it("defaults targetOrigin to '*' when serverURL is omitted", () => {
    const postMessageSpy = vi.fn<() => void>();
    const originalParent = window.parent;
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: { postMessage: postMessageSpy },
      writable: true,
    });

    ready();

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        ready: true,
        type: "payload-live-preview",
      },
      "*"
    );

    Object.defineProperty(window, "parent", {
      configurable: true,
      value: originalParent,
      writable: true,
    });
  });

  it("does not send message to itself when running top-level outside iframe", () => {
    const postMessageSpy = vi.fn<() => void>();
    const originalParent = window.parent;
    const originalPostMessage = window.postMessage;
    window.postMessage = postMessageSpy;
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: window,
      writable: true,
    });

    ready({ serverURL: "http://localhost:3000" });

    expect(postMessageSpy).not.toHaveBeenCalled();

    window.postMessage = originalPostMessage;
    Object.defineProperty(window, "parent", {
      configurable: true,
      value: originalParent,
      writable: true,
    });
  });
});

describe(subscribeThemeLivePreview, () => {
  let addEventListenerSpy: MockInstance;
  let removeEventListenerSpy: MockInstance;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("subscribes to window message event and removes listener upon unsubscribe", () => {
    const onUpdate = vi.fn<() => void>();
    const unsubscribe = subscribeThemeLivePreview({
      manifest: mockManifest,
      onUpdate,
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );

    unsubscribe();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "message",
      expect.any(Function)
    );
  });

  it("ignores messages with invalid type or non-matching serverURL origin", () => {
    const onUpdate = vi.fn<() => void>();
    const unsubscribe = subscribeThemeLivePreview({
      manifest: mockManifest,
      onUpdate,
      serverURL: "http://localhost:3000",
    });

    // Foreign origin
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://malicious-site.com",
        data: {
          data: { settings: { primaryColor: "#ff0000" } },
          type: "payload-live-preview",
        },
      })
    );

    // Invalid type
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          data: { settings: { primaryColor: "#ff0000" } },
          type: "other-event",
        },
      })
    );

    expect(onUpdate).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("recalculates CSS custom properties via evaluateThemeCssVars when theme settings update", () => {
    const onUpdate = vi.fn<(update: ThemeLivePreviewUpdate) => void>();
    const unsubscribe = subscribeThemeLivePreview({
      baseTokens: { "--base-token": "10px" },
      manifest: mockManifest,
      onUpdate,
      serverURL: "http://localhost:3000",
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          collectionSlug: "themes",
          type: "payload-live-preview",
          data: {
            settings: {
              fontSize: 20,
              primaryColor: "#00ff00",
            },
          },
        },
      })
    );

    expect(onUpdate).toHaveBeenCalledOnce();
    const [firstCall] = onUpdate.mock.calls;
    const [update] = firstCall ?? [];
    expect(update?.settings).toStrictEqual({
      fontSize: 20,
      primaryColor: "#00ff00",
    });
    expect(update?.themeCssVars).toStrictEqual({
      "--base-token": "10px",
      "--font-size": "20px",
      "--primary": "#00ff00",
    });

    unsubscribe();
  });

  it("updates sections when template sections update", () => {
    const onUpdate = vi.fn<(update: ThemeLivePreviewUpdate) => void>();
    const unsubscribe = subscribeThemeLivePreview({
      manifest: mockManifest,
      onUpdate,
    });

    const newSections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        id: "section-1",
        settings: { title: "Hello World" },
      },
      {
        blockType: "mock_banner",
        id: "section-2",
        settings: { text: "Announce" },
      },
    ];

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          collectionSlug: "templates",
          type: "payload-live-preview",
          data: {
            sections: newSections,
          },
        },
      })
    );

    expect(onUpdate).toHaveBeenCalledOnce();
    const [firstCall] = onUpdate.mock.calls;
    const [update] = firstCall ?? [];
    expect(update?.sections).toStrictEqual(newSections);

    unsubscribe();
  });

  it("invokes refresh and onDocumentEvent callbacks when payload-document-event is received", () => {
    const onUpdate = vi.fn<() => void>();
    const onDocumentEvent = vi.fn<() => void>();
    const refresh = vi.fn<() => void>();

    const unsubscribe = subscribeThemeLivePreview({
      manifest: mockManifest,
      onDocumentEvent,
      onUpdate,
      refresh,
      serverURL: "http://localhost:3000",
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:3000",
        data: {
          event: "save",
          type: "payload-document-event",
        },
      })
    );

    expect(refresh).toHaveBeenCalledOnce();
    expect(onDocumentEvent).toHaveBeenCalledOnce();
    expect(onUpdate).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("ignores payload-document-event if origin does not match serverURL", () => {
    const refresh = vi.fn<() => void>();
    const onDocumentEvent = vi.fn<() => void>();

    const unsubscribe = subscribeThemeLivePreview({
      manifest: mockManifest,
      onDocumentEvent,
      refresh,
      serverURL: "http://localhost:3000",
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://malicious-site.com",
        data: {
          type: "payload-document-event",
        },
      })
    );

    expect(refresh).not.toHaveBeenCalled();
    expect(onDocumentEvent).not.toHaveBeenCalled();

    unsubscribe();
  });
});

describe(isThemePreviewMessage, () => {
  it("identifies payload-live-preview and payload-document-event as valid theme preview messages", () => {
    const livePreviewEvent = new MessageEvent("message", {
      data: { data: {}, type: "payload-live-preview" },
    });
    const docEvent = new MessageEvent("message", {
      data: { type: "payload-document-event" },
    });
    const unknownEvent = new MessageEvent("message", {
      data: { type: "other-event" },
    });
    const nonObjectEvent = new MessageEvent("message", {
      data: "hello",
    });

    expect(isThemePreviewMessage(livePreviewEvent)).toBeTruthy();
    expect(isThemePreviewMessage(docEvent)).toBeTruthy();
    expect(isThemePreviewMessage(unknownEvent)).toBeFalsy();
    expect(isThemePreviewMessage(nonObjectEvent)).toBeFalsy();
  });
});
