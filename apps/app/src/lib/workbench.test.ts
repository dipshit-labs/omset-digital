import { describe, expect, it } from "bun:test";
import {
  filterAndSortSections,
  TemplateTokenSchema,
} from "@repo/template-contract";
import { MOCK_SECTIONS, MOCK_TENANT } from "./workbench";

describe("Workbench mock data", () => {
  it("MOCK_TENANT contains valid template tokens with all required shadcn variables", () => {
    expect(MOCK_TENANT.name).toBe("Kopi Makmur Nusantara");
    expect(MOCK_TENANT.activeTemplate).toBe("default");

    const validatedTokens = TemplateTokenSchema.parse(
      MOCK_TENANT.templateTokens
    );
    expect(validatedTokens.primary).toBe(MOCK_TENANT.templateTokens.primary);
    expect(validatedTokens.primaryForeground).toBe(
      MOCK_TENANT.templateTokens.primaryForeground
    );
    expect(validatedTokens.border).toBe(MOCK_TENANT.templateTokens.border);
    expect(validatedTokens.card).toBe(MOCK_TENANT.templateTokens.card);
    expect(validatedTokens.input).toBe(MOCK_TENANT.templateTokens.input);
  });

  it("MOCK_SECTIONS has all 6 standard section types enabled", () => {
    const sorted = filterAndSortSections(MOCK_SECTIONS);

    expect(sorted.length).toBe(6);
    const types = sorted.map((s) => s.type);
    expect(types).toEqual([
      "hero",
      "product-grid",
      "about",
      "testimonials",
      "contact",
      "blog-preview",
    ]);
  });
});
