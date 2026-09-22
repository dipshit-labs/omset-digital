import type {
  CheckboxField,
  Field,
  GroupField,
  NumberField,
  SelectField,
  TextField,
} from "payload";
import type { z } from "zod";

const SUPPORTED_TYPES = [
  "string",
  "enum",
  "object",
  "boolean",
  "number",
  "optional",
] as const;
const ZOD_PREFIX_REGEX = /^Zod/;

interface UnwrappedSchema {
  coreSchema: z.ZodTypeAny;
  coreType: string;
  defaultValue?: unknown;
  isOptional: boolean;
}

function getRawZodType(schema: z.ZodTypeAny): string {
  if (typeof schema === "object" && schema !== null) {
    if (
      "def" in schema &&
      typeof schema.def === "object" &&
      schema.def !== null &&
      "type" in schema.def &&
      typeof schema.def.type === "string"
    ) {
      return schema.def.type.toLowerCase();
    }

    if (
      "_def" in schema &&
      typeof schema._def === "object" &&
      schema._def !== null &&
      "typeName" in schema._def &&
      typeof schema._def.typeName === "string"
    ) {
      return schema._def.typeName.replace(ZOD_PREFIX_REGEX, "").toLowerCase();
    }
  }

  return "unknown";
}

function getInnerSchema(schema: object): z.ZodTypeAny | undefined {
  if (
    "def" in schema &&
    typeof schema.def === "object" &&
    schema.def !== null &&
    "innerType" in schema.def &&
    schema.def.innerType
  ) {
    return schema.def.innerType as z.ZodTypeAny;
  }
  if (
    "_def" in schema &&
    typeof schema._def === "object" &&
    schema._def !== null &&
    "innerType" in schema._def &&
    schema._def.innerType
  ) {
    return schema._def.innerType as z.ZodTypeAny;
  }
  return undefined;
}

function getDefaultValue(schema: object): unknown {
  let rawDefaultOrFactory: unknown;
  if (
    "def" in schema &&
    typeof schema.def === "object" &&
    schema.def !== null &&
    "defaultValue" in schema.def
  ) {
    rawDefaultOrFactory = schema.def.defaultValue;
  } else if (
    "_def" in schema &&
    typeof schema._def === "object" &&
    schema._def !== null &&
    "defaultValue" in schema._def
  ) {
    rawDefaultOrFactory = schema._def.defaultValue;
  }
  return typeof rawDefaultOrFactory === "function"
    ? rawDefaultOrFactory()
    : rawDefaultOrFactory;
}

function unwrapSchema(schema: z.ZodTypeAny): UnwrappedSchema {
  let current: z.ZodTypeAny = schema;
  let isOptional = false;
  let defaultValue: unknown;

  while (current && typeof current === "object") {
    const rawType = getRawZodType(current);

    if (rawType === "optional") {
      isOptional = true;
      const inner = getInnerSchema(current);
      if (inner) {
        current = inner;
        continue;
      }
      break;
    }

    if (rawType === "default") {
      defaultValue = getDefaultValue(current);
      const inner = getInnerSchema(current);
      if (inner) {
        current = inner;
        continue;
      }
      break;
    }

    break;
  }

  return {
    coreSchema: current,
    coreType: getRawZodType(current),
    defaultValue,
    isOptional,
  };
}

function validateWithZod(
  schema: z.ZodTypeAny,
  isOptional: boolean,
  value: unknown
): true | string {
  if (value === undefined || value === null || value === "") {
    if (isOptional) {
      return true;
    }
    return "This field is required.";
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    return result.error.issues[0]?.message ?? "Invalid value";
  }
  return true;
}

export function zodToPayloadField(name: string, schema: z.ZodTypeAny): Field {
  const { coreSchema, coreType, defaultValue, isOptional } =
    unwrapSchema(schema);

  switch (coreType) {
    case "string": {
      const field: TextField = {
        name,
        required: !isOptional,
        type: "text",
        validate: (value) => validateWithZod(schema, isOptional, value),
      };
      if (defaultValue !== undefined) {
        field.defaultValue = defaultValue as string;
      }
      return field;
    }

    case "number": {
      const field: NumberField = {
        name,
        required: !isOptional,
        type: "number",
        validate: (value) => validateWithZod(schema, isOptional, value),
      };
      if (defaultValue !== undefined) {
        field.defaultValue = defaultValue as number;
      }
      return field;
    }

    case "boolean": {
      const field: CheckboxField = {
        name,
        required: !isOptional,
        type: "checkbox",
        validate: (value) => validateWithZod(schema, isOptional, value),
      };
      if (defaultValue !== undefined) {
        field.defaultValue = defaultValue as boolean;
      }
      return field;
    }

    case "enum": {
      let optionsArray: string[] = [];
      if (typeof coreSchema === "object" && coreSchema !== null) {
        if ("options" in coreSchema && Array.isArray(coreSchema.options)) {
          optionsArray = coreSchema.options as string[];
        } else if (
          "def" in coreSchema &&
          typeof coreSchema.def === "object" &&
          coreSchema.def !== null &&
          "entries" in coreSchema.def &&
          typeof coreSchema.def.entries === "object" &&
          coreSchema.def.entries !== null
        ) {
          optionsArray = Object.keys(coreSchema.def.entries);
        }
      }

      const field: SelectField = {
        name,
        options: optionsArray.map((opt) => ({
          label: opt,
          value: opt,
        })),
        required: !isOptional,
        type: "select",
        validate: (value) => validateWithZod(schema, isOptional, value),
      };
      if (defaultValue !== undefined) {
        field.defaultValue = defaultValue as string;
      }
      return field;
    }

    case "object": {
      const objectSchema = coreSchema as z.ZodObject<z.ZodRawShape>;
      const field: GroupField = {
        name,
        fields: zodToPayloadFields(objectSchema),
        type: "group",
      };
      return field;
    }

    default: {
      throw new Error(
        `Unsupported Zod schema type "${coreType}" for field "${name}". Supported types are: ${SUPPORTED_TYPES.join(", ")}.`
      );
    }
  }
}

export function zodToPayloadFields(
  schema: z.ZodObject<z.ZodRawShape>
): Field[] {
  let shape: z.ZodRawShape | undefined;
  if (
    "shape" in schema &&
    typeof schema.shape === "object" &&
    schema.shape !== null
  ) {
    shape = schema.shape as z.ZodRawShape;
  } else if (
    "def" in schema &&
    typeof schema.def === "object" &&
    schema.def !== null &&
    "shape" in schema.def &&
    typeof schema.def.shape === "object" &&
    schema.def.shape !== null
  ) {
    shape = schema.def.shape as z.ZodRawShape;
  }

  if (!shape) {
    throw new Error(
      "Expected a ZodObject schema with a shape to convert into Payload fields."
    );
  }

  return Object.entries(shape).map(([key, childSchema]) =>
    zodToPayloadField(key, childSchema as z.ZodTypeAny)
  );
}
