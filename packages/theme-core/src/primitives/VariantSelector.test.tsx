import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VariantSelector } from "./VariantSelector";

const options = [
  { name: "Size", values: ["S", "M", "L", "XL"] },
  { name: "Color", values: ["Red", "Green", "Blue"] },
];

const ControlledSelector = (): ReactElement => {
  const [selected, setSelected] = useState<Record<string, string>>({
    Size: "S",
  });

  return (
    <VariantSelector
      onSelectOption={(group: string, value: string) => {
        setSelected((prev) => ({ ...prev, [group]: value }));
      }}
      options={options}
      selectedOptions={selected}
    />
  );
};

describe("VariantSelector primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders option groups with accessible fieldset groups", () => {
    render(
      <VariantSelector
        options={options}
        selectedOptions={{ Color: "Red", Size: "M" }}
      />
    );

    const sizeGroup = screen.getByRole("group", { name: "Size" });
    const colorGroup = screen.getByRole("group", { name: "Color" });

    expect(sizeGroup).toBeDefined();
    expect(colorGroup).toBeDefined();
  });

  it("marks selected radio options as checked", () => {
    render(
      <VariantSelector
        options={options}
        selectedOptions={{ Color: "Red", Size: "M" }}
      />
    );

    const mOption = screen.getByRole("radio", {
      name: "M",
    }) as HTMLInputElement;
    const sOption = screen.getByRole("radio", {
      name: "S",
    }) as HTMLInputElement;
    const redOption = screen.getByRole("radio", {
      name: "Red",
    }) as HTMLInputElement;

    expect(mOption.checked).toBeTruthy();
    expect(sOption.checked).toBeFalsy();
    expect(redOption.checked).toBeTruthy();
  });

  it("fires onSelectOption when an option is clicked", () => {
    const handleSelect = vi.fn<(group: string, value: string) => void>();
    render(
      <VariantSelector
        onSelectOption={handleSelect}
        options={options}
        selectedOptions={{ Color: "Red", Size: "M" }}
      />
    );

    const lOption = screen.getByRole("radio", { name: "L" });
    fireEvent.click(lOption);

    expect(handleSelect).toHaveBeenCalledWith("Size", "L");
  });

  it("updates state in a controlled component", () => {
    render(<ControlledSelector />);

    const sOption = screen.getByRole("radio", {
      name: "S",
    }) as HTMLInputElement;
    const mOption = screen.getByRole("radio", {
      name: "M",
    }) as HTMLInputElement;

    expect(sOption.checked).toBeTruthy();
    expect(mOption.checked).toBeFalsy();

    fireEvent.click(mOption);

    expect(sOption.checked).toBeFalsy();
    expect(mOption.checked).toBeTruthy();
  });

  it("handles disabled options", () => {
    const handleSelect = vi.fn<(group: string, value: string) => void>();
    const optionsWithDisabled = [
      {
        name: "Size",
        values: ["S", { disabled: true, value: "M" }, "L"],
      },
    ];

    render(
      <VariantSelector
        onSelectOption={handleSelect}
        options={optionsWithDisabled}
        selectedOptions={{ Size: "S" }}
      />
    );

    const mOption = screen.getByRole("radio", {
      name: "M",
    }) as HTMLInputElement;
    expect(mOption.disabled).toBeTruthy();

    fireEvent.click(mOption);
    expect(handleSelect).not.toHaveBeenCalled();
  });
});
