import { describe, expect, it } from "bun:test";
import { filterAndSortSections, type SectionConfig } from "./index";

describe("filterAndSortSections", () => {
  it("filters out disabled sections and sorts by order ascending", () => {
    const rawSections: SectionConfig[] = [
      { data: {}, enabled: true, id: "s3", order: 3, type: "about" },
      { data: {}, enabled: true, id: "s1", order: 1, type: "hero" },
      { data: {}, enabled: false, id: "s2", order: 2, type: "product-grid" },
      { data: {}, enabled: true, id: "s4", order: 4, type: "contact" },
    ];

    const sorted = filterAndSortSections(rawSections);

    expect(sorted.map((s) => s.id)).toEqual(["s1", "s3", "s4"]);
    expect(sorted.map((s) => s.type)).toEqual(["hero", "about", "contact"]);
  });

  it("handles empty array cleanly", () => {
    expect(filterAndSortSections([])).toEqual([]);
  });
});
