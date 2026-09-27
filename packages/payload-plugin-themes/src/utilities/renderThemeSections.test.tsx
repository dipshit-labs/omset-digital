// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  SectionProps,
  TemplateSectionInstance,
  ThemeManifestDefinition,
} from "../types";
import { renderThemeSections } from "./renderThemeSections";

const MockHeroComponent = ({
  blocks,
  id,
  settings,
}: SectionProps<{ headline: string }, { label: string }>): ReactElement => (
  <section data-testid="mock-hero" id={id}>
    <h1>{settings?.headline}</h1>
    <ul>
      {blocks?.map((block, idx) => (
        <li key={idx}>{block.label}</li>
      ))}
    </ul>
  </section>
);

const mockThemeManifest: ThemeManifestDefinition = {
  name: "Mock Theme",
  slug: "mock",
  version: "1.0.0",
  sections: [
    {
      Component: MockHeroComponent,
      name: "Hero",
      slug: "hero",
    },
  ],
};

describe(renderThemeSections, () => {
  afterEach(() => {
    cleanup();
  });

  it("renders matching section component with explicit settings and blocks", () => {
    const sections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        id: "hero-1",
        settings: { headline: "Welcome to Omset" },
        blocks: [
          { blockType: "bullet", label: "Bullet 1" },
          { blockType: "bullet", label: "Bullet 2" },
        ],
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div>{rendered}</div>);

    const hero = screen.getByTestId("mock-hero");
    expect(hero).toBeDefined();
    expect(hero.getAttribute("id")).toBe("hero-1");
    expect(screen.getByText("Welcome to Omset")).toBeDefined();
    expect(screen.getByText("Bullet 1")).toBeDefined();
    expect(screen.getByText("Bullet 2")).toBeDefined();
  });

  it("handles flat settings on section document when explicit settings object is absent", () => {
    const sections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        headline: "Flat Heading",
        id: "hero-flat",
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div>{rendered}</div>);

    expect(screen.getByText("Flat Heading")).toBeDefined();
  });

  it("skips blocks from a different theme prefix", () => {
    const sections: TemplateSectionInstance[] = [
      {
        blockType: "other_hero",
        id: "other-1",
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div data-testid="container">{rendered}</div>);

    expect(screen.queryByTestId("mock-hero")).toBeNull();
  });

  it("skips sections not defined in manifest", () => {
    const sections: TemplateSectionInstance[] = [
      {
        blockType: "mock_unknown",
        id: "unknown-1",
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div data-testid="container">{rendered}</div>);

    expect(screen.queryByTestId("mock-hero")).toBeNull();
  });
});
