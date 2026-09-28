// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Link } from "./Link";

describe("Link primitive adapter", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a standard <a> element outside Next.js", () => {
    render(
      <Link className="font-semibold" href="/collections/all">
        Browse Collection
      </Link>
    );

    const anchor = screen.getByRole("link", { name: "Browse Collection" });
    expect(anchor).toBeDefined();
    expect(anchor.tagName).toBe("A");
    expect(anchor.getAttribute("href")).toBe("/collections/all");
    expect(anchor.dataset.slot).toBe("link");
    expect(anchor.className).toContain("font-semibold");
  });

  it("does not leak Next.js specific props onto the HTML <a> element in fallback mode", () => {
    render(
      <Link href="/products" prefetch={false} replace scroll={false}>
        Products
      </Link>
    );

    const anchor = screen.getByRole("link", { name: "Products" });
    expect(anchor.getAttribute("prefetch")).toBeNull();
    expect(anchor.getAttribute("replace")).toBeNull();
    expect(anchor.getAttribute("scroll")).toBeNull();
  });

  it("handles standard anchor attributes and click events in fallback mode", () => {
    const handleClick = vi.fn<() => void>();
    render(
      <Link
        href="https://example.com"
        onClick={handleClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        External
      </Link>
    );

    const anchor = screen.getByRole("link", { name: "External" });
    expect(anchor.getAttribute("target")).toBe("_blank");
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");

    fireEvent.click(anchor);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("renders next/link when adapter is explicitly next", () => {
    render(
      <Link adapter="next" href="/store">
        Storefront
      </Link>
    );

    const link = screen.getByRole("link", { name: "Storefront" });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/store");
  });
});
