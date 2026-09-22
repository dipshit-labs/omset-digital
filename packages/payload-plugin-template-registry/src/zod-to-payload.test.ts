import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { zodToPayloadField, zodToPayloadFields } from "./zod-to-payload";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ARRAY_ERROR_REGEX =
  /Unsupported Zod schema type "array" for field "tags".*Supported types are: string, enum, object, boolean, number, optional/;
const DATE_ERROR_REGEX =
  /Unsupported Zod schema type "date" for field "publishedAt"/;
const UNION_ERROR_REGEX =
  /Unsupported Zod schema type "union" for field "mixed"/;

describe("zodToPayloadField / zodToPayloadFields", () => {
  describe("string schema", () => {
    it("converts required z.string() to text field", () => {
      const field = zodToPayloadField("title", z.string());

      expect("name" in field && field.name).toBe("title");
      expect(field.type).toBe("text");
      expect("required" in field && field.required).toBe(true);

      if ("validate" in field && typeof field.validate === "function") {
        expect(field.validate("valid title", {} as never)).toBe(true);
        expect(typeof field.validate("", {} as never)).toBe("string");
        expect(typeof field.validate(123, {} as never)).toBe("string");
      }
    });

    it("respects regex validation on string schemas", () => {
      const schema = z.string().regex(HEX_COLOR_REGEX, "Invalid hex color");
      const field = zodToPayloadField("primaryColor", schema);

      expect(field.type).toBe("text");
      if ("validate" in field && typeof field.validate === "function") {
        expect(field.validate("#ff0000", {} as never)).toBe(true);
        expect(field.validate("#f00", {} as never)).toBe(true);
        expect(field.validate("invalid-color", {} as never)).toBe(
          "Invalid hex color"
        );
      }
    });
  });

  describe("number schema", () => {
    it("converts required z.number() to number field", () => {
      const field = zodToPayloadField("columns", z.number());

      expect("name" in field && field.name).toBe("columns");
      expect(field.type).toBe("number");
      expect("required" in field && field.required).toBe(true);

      if ("validate" in field && typeof field.validate === "function") {
        expect(field.validate(4, {} as never)).toBe(true);
        expect(typeof field.validate("invalid", {} as never)).toBe("string");
      }
    });
  });

  describe("boolean schema", () => {
    it("converts required z.boolean() to checkbox field", () => {
      const field = zodToPayloadField("showTicker", z.boolean());

      expect("name" in field && field.name).toBe("showTicker");
      expect(field.type).toBe("checkbox");

      if ("validate" in field && typeof field.validate === "function") {
        expect(field.validate(true, {} as never)).toBe(true);
        expect(field.validate(false, {} as never)).toBe(true);
        expect(typeof field.validate("not-a-bool", {} as never)).toBe("string");
      }
    });
  });

  describe("enum schema", () => {
    it("converts z.enum() to select field with matching options", () => {
      const field = zodToPayloadField(
        "layout",
        z.enum(["centered", "split", "grid"])
      );

      expect("name" in field && field.name).toBe("layout");
      expect(field.type).toBe("select");
      expect("required" in field && field.required).toBe(true);

      if ("options" in field) {
        expect(field.options).toEqual([
          { label: "centered", value: "centered" },
          { label: "split", value: "split" },
          { label: "grid", value: "grid" },
        ]);
      }

      if ("validate" in field && typeof field.validate === "function") {
        expect(field.validate("centered", {} as never)).toBe(true);
        expect(field.validate("split", {} as never)).toBe(true);
        expect(typeof field.validate("unknown", {} as never)).toBe("string");
      }
    });
  });

  describe("optional and default values", () => {
    it("converts z.optional() to field with required: false", () => {
      const field = zodToPayloadField("subtitle", z.string().optional());

      expect(field.type).toBe("text");
      expect("required" in field && field.required).toBe(false);

      if ("validate" in field && typeof field.validate === "function") {
        expect(field.validate(undefined, {} as never)).toBe(true);
        expect(field.validate(null, {} as never)).toBe(true);
        expect(field.validate("", {} as never)).toBe(true);
        expect(field.validate("A real subtitle", {} as never)).toBe(true);
      }
    });

    it("extracts defaultValue from z.default()", () => {
      const field = zodToPayloadField(
        "heroLayout",
        z.enum(["centered", "split"]).default("centered")
      );

      expect(field.type).toBe("select");
      expect("defaultValue" in field && field.defaultValue).toBe("centered");
    });
  });

  describe("object schema", () => {
    it("converts z.object() to group field with nested fields", () => {
      const schema = z.object({
        heroLayout: z.enum(["centered", "split"]).default("centered"),
        showTicker: z.boolean().default(false),
      });

      const field = zodToPayloadField("settings", schema);

      expect("name" in field && field.name).toBe("settings");
      expect(field.type).toBe("group");
      if ("fields" in field) {
        expect(field.fields).toHaveLength(2);
        const [first, second] = field.fields;
        expect("name" in first && first.name).toBe("heroLayout");
        expect("type" in first && first.type).toBe("select");
        expect("name" in second && second.name).toBe("showTicker");
        expect("type" in second && second.type).toBe("checkbox");
      }
    });

    it("zodToPayloadFields converts shape of ZodObject into Field array", () => {
      const schema = z.object({
        accent: z.string(),
        borderRadius: z.enum(["none", "sm", "md", "lg", "full"]),
        columns: z.number().optional(),
      });

      const fields = zodToPayloadFields(schema);

      expect(fields).toHaveLength(3);
      expect("name" in fields[0] && fields[0].name).toBe("accent");
      expect("name" in fields[1] && fields[1].name).toBe("borderRadius");
      expect("name" in fields[2] && fields[2].name).toBe("columns");
    });
  });

  describe("unsupported types", () => {
    it("throws descriptive configuration error for z.array()", () => {
      expect(() => {
        zodToPayloadField("tags", z.array(z.string()));
      }).toThrow(ARRAY_ERROR_REGEX);
    });

    it("throws descriptive configuration error for z.date()", () => {
      expect(() => {
        zodToPayloadField("publishedAt", z.date());
      }).toThrow(DATE_ERROR_REGEX);
    });

    it("throws descriptive configuration error for z.union()", () => {
      expect(() => {
        zodToPayloadField("mixed", z.union([z.string(), z.number()]));
      }).toThrow(UNION_ERROR_REGEX);
    });
  });
});
