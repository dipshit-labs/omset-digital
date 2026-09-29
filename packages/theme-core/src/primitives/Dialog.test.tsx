// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";

describe("Dialog primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders trigger and opens dialog upon interaction", () => {
    render(
      <Dialog>
        <DialogTrigger>Open Modal</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modal Heading</DialogTitle>
            <DialogDescription>Modal details text.</DialogDescription>
          </DialogHeader>
          <div>Body content</div>
          <DialogClose>Dismiss</DialogClose>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: "Open Modal" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Modal Heading")).toBeDefined();
    expect(screen.getByText("Modal details text.")).toBeDefined();
  });

  it("closes dialog upon dismiss interaction", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Heading</DialogTitle>
          </DialogHeader>
          <DialogClose>Dismiss</DialogClose>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    const closeButton = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(closeButton);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismisses open dialog on Escape keyboard interaction", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Modal</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("applies functional positioning and elevated surface class", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>Unstyled Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.dataset.slot).toBe("dialog-content");
    expect(dialog.className).toContain("p-6");
    expect(dialog.className).toContain("fixed");
    expect(dialog.className).toContain("bg-surface-elevated");
    expect(dialog.className).not.toContain("border-");
  });
});
