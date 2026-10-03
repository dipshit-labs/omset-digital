import { describe, expect, it } from "vitest";

import { themeTemplateField } from "./themeTemplateField";

describe(themeTemplateField, () => {
  it("creates relationship field pointing to templates collection", () => {
    const field = themeTemplateField();

    expect(field.name).toBe("template");
    expect(field.relationTo).toBe("templates");
    expect(field.type).toBe("relationship");
    expect(field.admin?.description).toBe(
      "Layout template assigned to this document"
    );
  });

  it("applies custom overrides to the field definition", () => {
    const field = themeTemplateField({
      required: true,
      admin: {
        description: "Custom template description",
        position: "sidebar",
      },
    });

    expect(field.name).toBe("template");
    expect(field.relationTo).toBe("templates");
    expect(field.required).toBeTruthy();
    expect(field.admin?.position).toBe("sidebar");
    expect(field.admin?.description).toBe("Custom template description");
  });
});
