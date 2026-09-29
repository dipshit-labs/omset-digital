// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Image } from "./Image";

describe("Image primitive adapter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a standard <img> element outside Next.js with raw src", () => {
    render(<Image alt="Product Thumbnail" src="/uploads/product.jpg" />);

    const img = screen.getByRole("img", { name: "Product Thumbnail" });
    expect(img).toBeDefined();
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toBe("/uploads/product.jpg");
    expect(img.dataset.slot).toBe("image");
    expect(img.getAttribute("srcset")).toBeNull();
  });

  it("applies width, height, and classes in fallback mode", () => {
    render(
      <Image
        alt="Thumbnail Dimensions"
        className="rounded-md"
        height={300}
        src="/uploads/product.jpg"
        width={300}
      />
    );

    const img = screen.getByRole("img", { name: "Thumbnail Dimensions" });
    expect(img.getAttribute("width")).toBe("300");
    expect(img.getAttribute("height")).toBe("300");
    expect(img.className).toContain("rounded-md");
  });

  it("supports fill layout with absolute positioning styles in fallback mode", () => {
    render(<Image alt="Hero Banner" fill src="/hero.jpg" />);

    const img = screen.getByRole("img", { name: "Hero Banner" });
    expect(img.className).toContain("absolute");
    expect(img.className).toContain("h-full");
    expect(img.className).toContain("w-full");
  });

  it("maps priority to eager loading in fallback mode without leaking next props", () => {
    render(
      <Image
        alt="Featured Item"
        height={200}
        priority
        src="/featured.jpg"
        width={200}
      />
    );

    const img = screen.getByRole("img", { name: "Featured Item" });
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("priority")).toBeNull();
  });

  it("does not leak Next-specific props onto fallback <img> element", () => {
    render(
      <Image
        alt="Safe Image"
        blurDataURL="data:image/png;base64,123"
        height={100}
        placeholder="blur"
        quality={80}
        src="/safe.jpg"
        width={100}
      />
    );

    const img = screen.getByRole("img", { name: "Safe Image" });
    expect(img.getAttribute("blurdataurl")).toBeNull();
    expect(img.getAttribute("placeholder")).toBeNull();
    expect(img.getAttribute("quality")).toBeNull();
  });

  it("handles object src shape (StaticImport)", () => {
    render(
      <Image
        alt="Imported"
        height={100}
        src={{ height: 100, src: "/imported.png", width: 100 }}
        width={100}
      />
    );

    const img = screen.getByRole("img", { name: "Imported" });
    expect(img.getAttribute("src")).toBe("/imported.png");
  });

  it("uses next/image when adapter is explicitly next", () => {
    render(
      <Image
        adapter="next"
        alt="Next Optimized"
        height={100}
        src="/next-photo.jpg"
        width={100}
      />
    );

    const img = screen.getByRole("img", { name: "Next Optimized" });
    expect(img.dataset.nimg).toBe("1");
  });
});
