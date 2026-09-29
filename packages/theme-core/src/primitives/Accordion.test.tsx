// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./Accordion";

describe("Accordion primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders accordion items and toggles content on click", () => {
    render(
      <Accordion>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Section 1 Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger1 = screen.getByRole("button", { name: "Section 1" });
    expect(trigger1.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Section 1 Content")).toBeNull();

    fireEvent.click(trigger1);

    expect(trigger1.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Section 1 Content")).toBeDefined();
  });

  it("collapses content when clicking an expanded item", () => {
    render(
      <Accordion defaultValue={["item-1"]}>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Section 1 Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const trigger1 = screen.getByRole("button", { name: "Section 1" });
    expect(trigger1.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(trigger1);
    expect(trigger1.getAttribute("aria-expanded")).toBe("false");
  });

  it("renders with zero color or border defaults while allowing custom classes", () => {
    render(
      <Accordion defaultValue={["item-1"]}>
        <AccordionItem className="p-4" value="item-1">
          <AccordionTrigger className="opacity-80">Trigger</AccordionTrigger>
          <AccordionContent className="flex">Details</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    const item = screen
      .getByText("Trigger")
      .closest('[data-slot="accordion-item"]');
    expect(item?.className).toContain("p-4");
    expect(item?.className).not.toContain("border-");

    const trigger = screen.getByRole("button", { name: "Trigger" });
    expect(trigger.className).toContain("opacity-80");
    expect(trigger.className).not.toContain("bg-");

    const content = screen.getByText("Details");
    expect(content.dataset.slot).toBe("accordion-content");
  });
});
