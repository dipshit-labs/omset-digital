import type { ReactElement } from "react";
import type {
  SectionProps,
  TemplateSectionInstance,
  ThemeManifestDefinition,
} from "../types";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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
      name: "Hero Section",
      Component: MockHeroComponent,
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
        id: "hero-1",
        blocks: [{ blockType: "bullet", label: "Fast shipping" }],
        blockType: "mock_hero",
        settings: {
          headline: "Welcome to Omset",
        },
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div>{rendered}</div>);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Welcome to Omset");

    const bullet = screen.getByText("Fast shipping");
    expect(bullet).not.toBeNull();
  });

  it("handles flat settings on section document when explicit settings object is absent", () => {
    const sections: TemplateSectionInstance[] = [
      {
        id: "hero-flat",
        blockType: "mock_hero",
        headline: "Direct Headline",
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div>{rendered}</div>);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Direct Headline");
  });

  it("skips blocks from a different theme prefix", () => {
    const sections: TemplateSectionInstance[] = [
      {
        id: "foreign-1",
        blockType: "foreign_hero",
        settings: {
          headline: "Foreign Theme",
        },
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    expect(rendered).toHaveLength(0);
  });

  it("skips sections not defined in manifest", () => {
    const sections: TemplateSectionInstance[] = [
      {
        id: "nonexistent-1",
        blockType: "mock_nonexistent",
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    expect(rendered).toHaveLength(0);
  });

  it("honors explicitly empty settings without falling back to document properties", () => {
    const sections: TemplateSectionInstance[] = [
      {
        id: "hero-empty-settings",
        blockType: "mock_hero",
        headline: "Leaked Document Headline",
        settings: {},
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div>{rendered}</div>);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("");
  });
});
