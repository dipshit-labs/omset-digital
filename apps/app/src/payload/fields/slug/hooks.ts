import type { FieldHook } from "payload";
import { slugify } from "payload/shared";

export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === "string" && value.length > 0) {
      return slugify(value);
    }

    if (operation === "create" || !data?.slug) {
      const fallbackData = data?.[fallback];

      if (fallbackData && typeof fallbackData === "string") {
        return slugify(fallbackData);
      }
    }

    return value;
  };
