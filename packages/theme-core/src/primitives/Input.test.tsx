// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Input } from "./Input";

describe("Input primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an input element with default attributes and data-slot", () => {
    render(<Input placeholder="Enter your name" />);

    const input = screen.getByPlaceholderText("Enter your name");
    expect(input).toBeDefined();
    expect(input.tagName).toBe("INPUT");
    expect(input.dataset.slot).toBe("input");
  });

  it("handles value change events", () => {
    const handleChange = vi.fn<() => void>();
    render(<Input onChange={handleChange} placeholder="Type here" />);

    const input = screen.getByPlaceholderText("Type here");
    fireEvent.change(input, { target: { value: "test value" } });

    expect(handleChange).toHaveBeenCalledOnce();
  });

  it("applies disabled attribute and classes correctly", () => {
    render(<Input disabled placeholder="Disabled input" />);

    const input = screen.getByPlaceholderText(
      "Disabled input"
    ) as HTMLInputElement;
    expect(input.disabled).toBeTruthy();
    expect(input.className).toContain("disabled:opacity-50");
  });

  it("merges custom className with defaults", () => {
    render(<Input className="border-error" placeholder="Custom class" />);

    const input = screen.getByPlaceholderText("Custom class");
    expect(input.className).toContain("border-error");
    expect(input.className).toContain("w-full");
  });
});
