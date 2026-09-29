// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders an accessible button with unstyled defaults and data-slot", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeDefined();
    expect(button.dataset.slot).toBe("button");
  });

  it("merges custom class names without injecting color or border defaults", () => {
    render(<Button className="p-4">Click</Button>);
    const button = screen.getByRole("button", { name: "Click" });
    expect(button.className).toContain("p-4");
    expect(button.className).not.toContain("bg-primary");
    expect(button.className).not.toContain("border");
  });

  it("handles click events", () => {
    const handleClick = vi.fn<() => void>();
    render(<Button onClick={handleClick}>Action</Button>);
    const button = screen.getByRole("button", { name: "Action" });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("disables click interactions when disabled", () => {
    const handleClick = vi.fn<() => void>();
    render(
      <Button disabled onClick={handleClick}>
        Disabled Button
      </Button>
    );
    const button = screen.getByRole("button", { name: "Disabled Button" });
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
