// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  TemplateSectionInstance,
  ThemeManifestDefinition,
} from "../../types";
import { useThemeLivePreview } from "./useThemeLivePreview";

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
      cssVar: "--radius",
      defaultValue: 4,
      label: "Radius",
      name: "radius",
      type: "number",
      unit: "px",
    },
  ],
};

describe(useThemeLivePreview, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gracefully falls back to initial server data when outside active preview frame", () => {
    const initialSections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        id: "hero-1",
        settings: { title: "Initial Title" },
      },
    ];

    const { result } = renderHook(() =>
      useThemeLivePreview({
        baseTokens: { "--base-bg": "#ffffff" },
        initialSections,
        initialSettings: { primaryColor: "#111111", radius: 4 },
        manifest: mockManifest,
      })
    );

    expect(result.current.isLive).toBeFalsy();
    expect(result.current.sections).toStrictEqual(initialSections);
    expect(result.current.settings).toStrictEqual({
      primaryColor: "#111111",
      radius: 4,
    });
    expect(result.current.themeCssVars).toStrictEqual({
      "--base-bg": "#ffffff",
      "--primary": "#111111",
      "--radius": "4px",
    });
    expect(result.current.style).toStrictEqual({
      "--base-bg": "#ffffff",
      "--primary": "#111111",
      "--radius": "4px",
    });
  });

  it("extracts initial state from initialTheme and initialTemplate if provided", () => {
    const initialSections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        id: "hero-1",
        settings: { title: "From Template" },
      },
    ];

    const { result } = renderHook(() =>
      useThemeLivePreview({
        initialTemplate: { sections: initialSections },
        initialTheme: { settings: { primaryColor: "#222222" } },
        manifest: mockManifest,
      })
    );

    expect(result.current.sections).toStrictEqual(initialSections);
    expect(result.current.settings).toStrictEqual({ primaryColor: "#222222" });
    expect(result.current.themeCssVars["--primary"]).toBe("#222222");
  });

  it("updates live settings and recalculates theme CSS custom properties on live preview postMessage", () => {
    const { result } = renderHook(() =>
      useThemeLivePreview({
        baseTokens: { "--base-bg": "#ffffff" },
        initialSettings: { primaryColor: "#000000", radius: 8 },
        manifest: mockManifest,
        serverURL: "http://localhost:3000",
      })
    );

    expect(result.current.isLive).toBeFalsy();

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:3000",
          data: {
            collectionSlug: "themes",
            type: "payload-live-preview",
            data: {
              settings: {
                primaryColor: "#ff00aa",
                radius: 12,
              },
            },
          },
        })
      );
    });

    expect(result.current.isLive).toBeTruthy();
    expect(result.current.settings).toStrictEqual({
      primaryColor: "#ff00aa",
      radius: 12,
    });
    expect(result.current.themeCssVars).toStrictEqual({
      "--base-bg": "#ffffff",
      "--primary": "#ff00aa",
      "--radius": "12px",
    });
    expect(result.current.style).toStrictEqual({
      "--base-bg": "#ffffff",
      "--primary": "#ff00aa",
      "--radius": "12px",
    });
  });

  it("updates live sections when template sections are modified, added, or reordered", () => {
    const initialSections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        id: "hero-1",
        settings: { title: "Original" },
      },
    ];

    const { result } = renderHook(() =>
      useThemeLivePreview({
        initialSections,
        manifest: mockManifest,
      })
    );

    const reorderedAndModifiedSections: TemplateSectionInstance[] = [
      {
        blockType: "mock_banner",
        id: "banner-1",
        settings: { text: "New Top Banner" },
      },
      {
        blockType: "mock_hero",
        id: "hero-1",
        settings: { title: "Updated Title" },
      },
    ];

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:3000",
          data: {
            collectionSlug: "templates",
            type: "payload-live-preview",
            data: {
              sections: reorderedAndModifiedSections,
            },
          },
        })
      );
    });

    expect(result.current.isLive).toBeTruthy();
    expect(result.current.sections).toStrictEqual(reorderedAndModifiedSections);
  });
});
