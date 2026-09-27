import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "./Hero";
import { HeroCtaClient } from "./HeroCtaClient";

describe("Hero section component", () => {
  it("renders heading and subheading", () => {
    render(
      <Hero
        blockType="default_hero"
        settings={{
          heading: "Welcome to Our Store",
          subheading: "High-quality products for everyone.",
        }}
      />
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toBe("Welcome to Our Store");

    const subheading = screen.getByText("High-quality products for everyone.");
    expect(subheading).toBeTruthy();
  });

  it("renders bullet blocks with appropriate icons", () => {
    render(
      <Hero
        blocks={[
          { blockType: "bullet", icon: "check", text: "Fast Delivery" },
          { blockType: "bullet", icon: "star", text: "Top Rated" },
          { blockType: "bullet", icon: "heart", text: "Made with Love" },
        ]}
        blockType="default_hero"
        settings={{ heading: "Features" }}
      />
    );

    expect(screen.getByText("Fast Delivery").textContent).toBe("Fast Delivery");
    expect(screen.getByText("✓").textContent).toBe("✓");
    expect(screen.getByText("★").textContent).toBe("★");
    expect(screen.getByText("♥").textContent).toBe("♥");
  });

  it("renders call to action link when cta url is provided", () => {
    render(
      <Hero
        blockType="default_hero"
        settings={{
          heading: "Welcome",
          cta: {
            label: "Shop Collection",
            newTab: true,
            url: "/products",
          },
        }}
      />
    );

    const link = screen.getByRole("link", { name: "Shop Collection" });
    expect(link.getAttribute("href")).toBe("/products");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });
});

describe(HeroCtaClient, () => {
  it("encapsulates click interaction in client component", () => {
    let clicked = false;
    render(
      <HeroCtaClient
        label="Order Now"
        onClick={() => {
          clicked = true;
        }}
        url="/order"
      />
    );

    const button = screen.getByRole("link", { name: "Order Now" });
    fireEvent.click(button);
    expect(clicked).toBeTruthy();
  });
});
