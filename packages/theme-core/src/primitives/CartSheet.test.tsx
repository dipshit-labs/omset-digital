// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import {
  CartSheet,
  CartSheetClose,
  CartSheetContent,
  CartSheetDescription,
  CartSheetFooter,
  CartSheetHeader,
  CartSheetItems,
  CartSheetTitle,
  CartSheetTrigger,
} from "./CartSheet";

describe("CartSheet primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders trigger and opens cart drawer upon interaction", () => {
    render(
      <CartSheet>
        <CartSheetTrigger>View Cart (2)</CartSheetTrigger>
        <CartSheetContent>
          <CartSheetHeader>
            <CartSheetTitle>Shopping Cart</CartSheetTitle>
            <CartSheetDescription>
              Review selected products
            </CartSheetDescription>
          </CartSheetHeader>
          <CartSheetItems>
            <div data-testid="cart-item-1">Item 1 - Rp 50.000</div>
          </CartSheetItems>
          <CartSheetFooter>
            <div>Subtotal: Rp 50.000</div>
          </CartSheetFooter>
        </CartSheetContent>
      </CartSheet>
    );

    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", { name: "View Cart (2)" });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Shopping Cart")).toBeDefined();
    expect(screen.getByTestId("cart-item-1")).toBeDefined();
  });

  it("closes cart sheet when close button is clicked", () => {
    render(
      <CartSheet defaultOpen>
        <CartSheetContent>
          <CartSheetHeader>
            <CartSheetTitle>Shopping Cart</CartSheetTitle>
          </CartSheetHeader>
          <CartSheetClose>Continue Shopping</CartSheetClose>
        </CartSheetContent>
      </CartSheet>
    );

    expect(screen.getByRole("dialog")).toBeDefined();
    const closeBtn = screen.getByRole("button", { name: "Continue Shopping" });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("applies slide-over positioning without color or border defaults", () => {
    render(
      <CartSheet defaultOpen>
        <CartSheetContent className="p-6">
          <CartSheetHeader>
            <CartSheetTitle>Cart Title</CartSheetTitle>
          </CartSheetHeader>
        </CartSheetContent>
      </CartSheet>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.dataset.slot).toBe("cart-sheet-content");
    expect(dialog.className).toContain("p-6");
    expect(dialog.className).toContain("fixed");
    expect(dialog.className).toContain("right-0");
    expect(dialog.className).not.toContain("bg-");
  });
});
