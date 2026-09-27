// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  SectionProps,
  TemplateSectionInstance,
  ThemeManifestDefinition,
} from "../../types";
import {
  ThemeLivePreview,
  ThemeLivePreviewClient,
} from "./ThemeLivePreviewClient";

const MockHero = ({
  id,
  settings,
}: SectionProps<{ title?: string }>): ReactElement => (
  <section data-testid="live-hero" id={id}>
    <h1>{settings?.title ?? "Default Title"}</h1>
  </section>
);

const mockManifest: ThemeManifestDefinition = {
  name: "Mock Theme",
  slug: "mock",
  version: "1.0.0",
  sections: [
    {
      Component: MockHero,
      name: "Hero",
      slug: "hero",
    },
  ],
  settings: [
    {
      cssVar: "--color-primary",
      defaultValue: "#111111",
      label: "Primary",
      name: "primary",
      type: "color",
    },
  ],
};

describe(ThemeLivePreviewClient, () => {
  afterEach(() => {
    cleanup();
  });

  it("renders default section tree from initial sections outside live preview frame", () => {
    const initialSections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        id: "hero-init",
        settings: { title: "Initial Server Title" },
      },
    ];

    const { container } = render(
      <ThemeLivePreviewClient
        initialSections={initialSections}
        manifest={mockManifest}
      />
    );

    // SAFETY: Root container div rendered by ThemeLivePreview is verified as first element child.
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.livePreview).toBe("inactive");
    expect(screen.getByTestId("live-hero")).toBeDefined();
    expect(screen.getByText("Initial Server Title")).toBeDefined();
  });

  it("accepts unified context prop", () => {
    const context = {
      manifest: mockManifest,
      settings: { primary: "#333333" },
      themeCssVars: { "--color-primary": "#333333" },
      sections: [
        {
          blockType: "mock_hero",
          id: "hero-ctx",
          settings: { title: "Context Title" },
        },
      ],
    };

    const { container } = render(<ThemeLivePreview context={context} />);

    // SAFETY: Root container div rendered by ThemeLivePreview is verified as first element child.
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.livePreview).toBe("inactive");
    expect(screen.getByText("Context Title")).toBeDefined();
  });

  it("updates DOM styles and section blocks when live preview event arrives", () => {
    const { container } = render(
      <ThemeLivePreviewClient
        initialSections={[
          {
            blockType: "mock_hero",
            id: "hero-old",
            settings: { title: "Old Title" },
          },
        ]}
        manifest={mockManifest}
        serverURL="http://localhost:3000"
      />
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:3000",
          data: {
            collectionSlug: "themes",
            type: "payload-live-preview",
            data: {
              settings: { primary: "#00ffcc" },
            },
          },
        })
      );
    });

    // SAFETY: Root container div rendered by ThemeLivePreview is verified as first element child.
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.livePreview).toBe("active");
    expect(root.style.getPropertyValue("--color-primary")).toBe("#00ffcc");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "http://localhost:3000",
          data: {
            collectionSlug: "templates",
            type: "payload-live-preview",
            data: {
              sections: [
                {
                  blockType: "mock_hero",
                  id: "hero-new",
                  settings: { title: "Updated Live Title" },
                },
              ],
            },
          },
        })
      );
    });

    expect(screen.getByText("Updated Live Title")).toBeDefined();
    expect(screen.queryByText("Old Title")).toBeNull();
  });

  it("supports custom render function via children prop", () => {
    render(
      <ThemeLivePreviewClient
        initialSections={[]}
        initialSettings={{ primary: "#123456" }}
        manifest={mockManifest}
      >
        {({ isLive, settings }) => (
          <div data-testid="custom-child">
            <span>Live: {isLive ? "yes" : "no"}</span>
            <span>Color: {String(settings.primary)}</span>
          </div>
        )}
      </ThemeLivePreviewClient>
    );

    expect(screen.getByTestId("custom-child")).toBeDefined();
    expect(screen.getByText("Live: no")).toBeDefined();
    expect(screen.getByText("Color: #123456")).toBeDefined();
  });

  it("throws descriptive error when manifest is missing from both props and context", () => {
    expect(() => render(<ThemeLivePreviewClient />)).toThrow(
      "ThemeLivePreview requires a valid manifest passed either directly or via context."
    );
  });
});
