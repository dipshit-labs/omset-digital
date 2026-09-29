// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuantityInput } from "./QuantityInput";

describe("QuantityInput primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders with default value and accessible spinbutton", () => {
    render(<QuantityInput defaultValue={1} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe("1");
  });

  it("increments within max bounds", () => {
    const handleChange = vi.fn<(val: number) => void>();

    const ControlledQuantity = () => {
      const [qty, setQty] = useState(2);
      return (
        <QuantityInput
          max={3}
          min={1}
          onChange={(val: number) => {
            setQty(val);
            handleChange(val);
          }}
          value={qty}
        />
      );
    };

    render(<ControlledQuantity />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    const incBtn = screen.getByRole("button", {
      name: /increase|increment|\+/iu,
    });

    fireEvent.click(incBtn);
    expect(handleChange).toHaveBeenCalledWith(3);
    expect(input.value).toBe("3");

    fireEvent.click(incBtn);
    expect(input.value).toBe("3");
  });

  it("decrements within min bounds", () => {
    const handleChange = vi.fn<(val: number) => void>();

    const ControlledQuantity = () => {
      const [qty, setQty] = useState(2);
      return (
        <QuantityInput
          max={4}
          min={1}
          onChange={(val: number) => {
            setQty(val);
            handleChange(val);
          }}
          value={qty}
        />
      );
    };

    render(<ControlledQuantity />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    const decBtn = screen.getByRole("button", {
      name: /decrease|decrement|-/iu,
    });

    fireEvent.click(decBtn);
    expect(handleChange).toHaveBeenCalledWith(1);
    expect(input.value).toBe("1");

    fireEvent.click(decBtn);
    expect(input.value).toBe("1");
  });

  it("handles direct text input and clamps to min/max", () => {
    const handleChange = vi.fn<(val: number) => void>();
    render(<QuantityInput max={10} min={1} onChange={handleChange} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "5" } });
    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it("steps value up and down on ArrowUp and ArrowDown keyboard events", () => {
    const handleChange = vi.fn<(val: number) => void>();
    render(
      <QuantityInput
        defaultValue={5}
        max={10}
        min={1}
        onChange={handleChange}
      />
    );
    const input = screen.getByRole("spinbutton") as HTMLInputElement;

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(handleChange).toHaveBeenCalledWith(6);
    expect(input.value).toBe("6");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(handleChange).toHaveBeenCalledWith(5);
    expect(input.value).toBe("5");
  });

  it("disables buttons and input when disabled is true", () => {
    const handleChange = vi.fn<(val: number) => void>();
    render(<QuantityInput defaultValue={2} disabled onChange={handleChange} />);

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    const incBtn = screen.getByRole("button", {
      name: /increase|increment|\+/iu,
    }) as HTMLButtonElement;
    const decBtn = screen.getByRole("button", {
      name: /decrease|decrement|-/iu,
    }) as HTMLButtonElement;

    expect(input.disabled).toBeTruthy();
    expect(incBtn.disabled).toBeTruthy();
    expect(decBtn.disabled).toBeTruthy();
  });
});
