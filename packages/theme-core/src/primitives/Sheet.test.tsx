import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";

describe("Sheet primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders trigger and opens sheet on click", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Cart</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>Review your items</SheetDescription>
          </SheetHeader>
          <div>Sheet body items</div>
          <SheetFooter>
            <SheetClose>Close Cart</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: "Open Cart" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Your Cart")).toBeDefined();
    expect(screen.getByText("Review your items")).toBeDefined();
  });

  it("closes sheet when close button is clicked", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
          </SheetHeader>
          <SheetClose>Close Cart</SheetClose>
        </SheetContent>
      </Sheet>
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    const closeBtn = screen.getByRole("button", { name: "Close Cart" });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismisses open sheet on Escape key", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Keyboard Sheet</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    const sheet = screen.getByRole("dialog");
    expect(sheet).toBeDefined();
    fireEvent.keyDown(sheet, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("applies functional slide-over positioning without surface background colors", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent className="p-6" side="right">
          <SheetHeader>
            <SheetTitle>Slide-out</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    const sheet = screen.getByRole("dialog");
    expect(sheet.dataset.slot).toBe("sheet-content");
    expect(sheet.className).toContain("p-6");
    expect(sheet.className).toContain("fixed");
    expect(sheet.className).toContain("right-0");
  });

  it("supports bottom sheet positioning", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Bottom Sheet</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

    const sheet = screen.getByRole("dialog");
    expect(sheet.className).toContain("bottom-0");
  });
});
