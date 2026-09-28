import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "./Hero";
import { HeroCtaClient } from "./HeroCtaClient";

describe("Minimal Hero section component", () => {
  it("renders eyebrow, heading, and subheading", () => {
    render(
      <Hero
        blockType="minimal_hero"
        settings={{
          eyebrow: "Selected Works",
          heading: "Essential Collection",
          subheading: "Thoughtfully curated objects for living.",
        }}
      />
    );

    const eyebrow = screen.getByText("Selected Works");
    expect(eyebrow).toBeTruthy();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Essential Collection");

    const subheading = screen.getByText(
      "Thoughtfully curated objects for living."
    );
    expect(subheading).toBeTruthy();
  });

  it("renders tag blocks", () => {
    render(
      <Hero
        blocks={[
          { blockType: "tag", label: "Handcrafted" },
          { blockType: "tag", label: "Organic" },
        ]}
        blockType="minimal_hero"
        settings={{ heading: "Minimalist Essentials" }}
      />
    );

    expect(screen.getByText("Handcrafted")).toBeTruthy();
    expect(screen.getByText("Organic")).toBeTruthy();
  });

  it("renders call to action link when cta url is provided", () => {
    render(
      <Hero
        blockType="minimal_hero"
        settings={{
          heading: "Welcome",
          cta: {
            label: "Explore",
            newTab: true,
            url: "/collections",
          },
        }}
      />
    );

    const link = screen.getByRole("link", { name: "Explore" });
    expect(link.getAttribute("href")).toBe("/collections");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });
});

describe(HeroCtaClient, () => {
  it("encapsulates click interaction in client component", () => {
    let clicked = false;
    render(
      <HeroCtaClient
        label="Discover Now"
        onClick={() => {
          clicked = true;
        }}
        url="/products"
      />
    );

    const link = screen.getByRole("link", { name: "Discover Now" });
    fireEvent.click(link);
    expect(clicked).toBeTruthy();
  });
});
