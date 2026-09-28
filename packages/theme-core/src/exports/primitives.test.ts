import { describe, expect, it } from "vitest";

import * as Primitives from "./primitives";

describe("@repo/theme-core/primitives public exports", () => {
  it("exports Button primitive", () => {
    expect(Primitives.Button).toBeDefined();
  });

  it("exports Dialog root, trigger, content, and header", () => {
    expect(Primitives.Dialog).toBeDefined();
    expect(Primitives.DialogTrigger).toBeDefined();
    expect(Primitives.DialogContent).toBeDefined();
    expect(Primitives.DialogHeader).toBeDefined();
  });

  it("exports Dialog title, description, and close", () => {
    expect(Primitives.DialogTitle).toBeDefined();
    expect(Primitives.DialogDescription).toBeDefined();
    expect(Primitives.DialogClose).toBeDefined();
  });

  it("exports Dialog portal, overlay, and footer", () => {
    expect(Primitives.DialogPortal).toBeDefined();
    expect(Primitives.DialogOverlay).toBeDefined();
    expect(Primitives.DialogFooter).toBeDefined();
  });

  it("exports Sheet root, trigger, content, and header", () => {
    expect(Primitives.Sheet).toBeDefined();
    expect(Primitives.SheetTrigger).toBeDefined();
    expect(Primitives.SheetContent).toBeDefined();
    expect(Primitives.SheetHeader).toBeDefined();
  });

  it("exports Sheet title, description, and close", () => {
    expect(Primitives.SheetTitle).toBeDefined();
    expect(Primitives.SheetDescription).toBeDefined();
    expect(Primitives.SheetClose).toBeDefined();
  });

  it("exports Sheet portal, overlay, and footer", () => {
    expect(Primitives.SheetPortal).toBeDefined();
    expect(Primitives.SheetOverlay).toBeDefined();
    expect(Primitives.SheetFooter).toBeDefined();
  });

  it("exports Input primitive", () => {
    expect(Primitives.Input).toBeDefined();
  });

  it("exports Accordion compound primitives", () => {
    expect(Primitives.Accordion).toBeDefined();
    expect(Primitives.AccordionItem).toBeDefined();
    expect(Primitives.AccordionTrigger).toBeDefined();
    expect(Primitives.AccordionContent).toBeDefined();
  });

  it("exports ProductPrice, QuantityInput, and VariantSelector", () => {
    expect(Primitives.ProductPrice).toBeDefined();
    expect(Primitives.QuantityInput).toBeDefined();
    expect(Primitives.VariantSelector).toBeDefined();
  });

  it("exports CartSheet root, trigger, content, and header", () => {
    expect(Primitives.CartSheet).toBeDefined();
    expect(Primitives.CartSheetTrigger).toBeDefined();
    expect(Primitives.CartSheetContent).toBeDefined();
    expect(Primitives.CartSheetHeader).toBeDefined();
  });

  it("exports CartSheet title, items, footer, and close", () => {
    expect(Primitives.CartSheetTitle).toBeDefined();
    expect(Primitives.CartSheetItems).toBeDefined();
    expect(Primitives.CartSheetFooter).toBeDefined();
    expect(Primitives.CartSheetClose).toBeDefined();
  });

  it("exports headless link and image primitives while hiding internal environment adapter", () => {
    expect(Primitives.Link).toBeDefined();
    expect(Primitives.Image).toBeDefined();
    expect(Reflect.has(Primitives, "isNextJsEnvironment")).toBeFalsy();
  });
});
