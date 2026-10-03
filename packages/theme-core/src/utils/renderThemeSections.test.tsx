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
      name: "Hero Section",
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
        blocks: [{ blockType: "bullet", label: "Fast shipping" }],
        blockType: "mock_hero",
        id: "hero-1",
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
        blockType: "mock_hero",
        headline: "Direct Headline",
        id: "hero-flat",
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
        blockType: "foreign_hero",
        id: "foreign-1",
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
        blockType: "mock_nonexistent",
        id: "nonexistent-1",
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    expect(rendered).toHaveLength(0);
  });

  it("honors explicitly empty settings without falling back to document properties", () => {
    const sections: TemplateSectionInstance[] = [
      {
        blockType: "mock_hero",
        headline: "Leaked Document Headline",
        id: "hero-empty-settings",
        settings: {},
      },
    ];

    const rendered = renderThemeSections(mockThemeManifest, sections);
    render(<div>{rendered}</div>);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("");
  });
});
