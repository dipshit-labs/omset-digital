import type {
  SectionProps,
  ThemeManifestDefinition,
} from "@repo/payload-plugin-themes/types";
import { defaultTheme } from "@repo/theme-default";
import { minimalTheme } from "@repo/theme-minimal";
import type { Store } from "@repo/types";
import { THEME_CSS_VARIABLES } from "@repo/ui/tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { StorefrontContext } from "@/lib/storefront";

import { StorefrontCanvas } from "./StorefrontCanvas";

const mockStore: Store = {
  createdAt: "",
  id: 1,
  name: "Toko Test",
  slug: "test",
  theme: "default",
  updatedAt: "",
  subscription: {
    status: "active",
  },
};

const MockCustomSection = ({
  blocks,
  settings,
}: SectionProps<{ title: string }, { text: string }>): ReactElement => (
  <div data-testid="custom-section">
    <h2>{settings?.title}</h2>
    <ul>
      {blocks?.map((b, i) => (
        <li key={b.text ?? i}>{b.text}</li>
      ))}
    </ul>
  </div>
);

const customTheme: ThemeManifestDefinition = {
  name: "Custom Theme",
  slug: "custom",
  version: "1.0.0",
  sections: [
    {
      Component: MockCustomSection,
      name: "Custom",
      slug: "custom",
    },
  ],
};

describe(StorefrontCanvas, () => {
  afterEach(() => {
    cleanup();
  });

  it("renders root container with active theme CSS custom properties", () => {
    const customCssVars = {
      [THEME_CSS_VARIABLES.accent]: "#00ffff",
      [THEME_CSS_VARIABLES.background]: "#ffffff",
      [THEME_CSS_VARIABLES.fontBody]: "Inter",
      [THEME_CSS_VARIABLES.fontHeading]: "Plus Jakarta Sans",
      [THEME_CSS_VARIABLES.foreground]: "#123456",
      [THEME_CSS_VARIABLES.primary]: "#ff0077",
    };

    const context: StorefrontContext = {
      manifest: defaultTheme,
      sections: [],
      store: mockStore,
      template: null,
      theme: null,
      themeCssVars: customCssVars,
    };

    const { container } = render(<StorefrontCanvas context={context} />);

    const rootWrapper = container.firstElementChild;
    expect(rootWrapper).toBeInstanceOf(HTMLElement);

    // SAFETY: Container first element is validated as HTMLElement.
    const htmlElement = rootWrapper as HTMLElement;
    expect(htmlElement.style.getPropertyValue("--primary")).toBe("#ff0077");
    expect(htmlElement.style.getPropertyValue("--foreground")).toBe("#123456");
    expect(htmlElement.style.getPropertyValue("--accent")).toBe("#00ffff");
  });

  it("matches {themeSlug}_{sectionSlug} block to active theme section component", () => {
    const context: StorefrontContext = {
      manifest: defaultTheme,
      store: mockStore,
      template: null,
      theme: null,
      themeCssVars: {},
      sections: [
        {
          blockType: "default_hero",
          id: "sec-1",
          settings: {
            heading: "Empower Your Business",
            subheading: "Curated products for you",
          },
        },
      ],
    };

    render(<StorefrontCanvas context={context} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Empower Your Business");
    expect(screen.getByText("Curated products for you")).toBeTruthy();
  });

  it("handles flattened settings from Payload template block", () => {
    const context: StorefrontContext = {
      manifest: defaultTheme,
      store: mockStore,
      template: null,
      theme: null,
      themeCssVars: {},
      sections: [
        {
          blockType: "default_hero",
          heading: "Direct Heading",
          id: "sec-flat",
          subheading: "Direct Subheading",
        },
      ],
    };

    render(<StorefrontCanvas context={context} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Direct Heading");
  });

  it("skips block types from non-matching themes", () => {
    const context: StorefrontContext = {
      manifest: defaultTheme,
      store: mockStore,
      template: null,
      theme: null,
      themeCssVars: {},
      sections: [
        {
          blockType: "custom_hero",
          heading: "Should Not Render",
          id: "sec-other",
        },
      ],
    };

    const { container } = render(<StorefrontCanvas context={context} />);

    expect(screen.queryByText("Should Not Render")).toBeNull();
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });

  it("safely skips unknown sections for active theme", () => {
    const context: StorefrontContext = {
      manifest: customTheme,
      store: mockStore,
      template: null,
      theme: null,
      themeCssVars: {},
      sections: [
        {
          blockType: "custom_nonexistent",
          id: "sec-missing",
        },
      ],
    };

    const { container } = render(<StorefrontCanvas context={context} />);

    expect(
      container.querySelectorAll('[data-testid="custom-section"]')
    ).toHaveLength(0);
  });

  it("renders minimal theme sections when minimal theme is active", () => {
    const context: StorefrontContext = {
      manifest: minimalTheme,
      store: mockStore,
      template: null,
      theme: null,
      sections: [
        {
          blocks: [{ blockType: "tag", label: "Handcrafted" }],
          blockType: "minimal_hero",
          eyebrow: "Limited Edition",
          heading: "Minimal Collection",
          id: "sec-min-1",
          subheading: "Minimalist design philosophy",
        },
      ],
      themeCssVars: {
        "--primary": "#18181b",
      },
    };

    render(<StorefrontCanvas context={context} />);

    expect(screen.getByText("Limited Edition")).toBeTruthy();
    expect(screen.getByText("Minimal Collection")).toBeTruthy();
    expect(screen.getByText("Handcrafted")).toBeTruthy();
  });
});
