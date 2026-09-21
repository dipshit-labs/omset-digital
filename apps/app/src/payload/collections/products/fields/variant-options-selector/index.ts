import type { RelationshipField } from "payload";

import { validateVariantOptions } from "./validate";

const variantOptionsSelectorField = (): RelationshipField => ({
  hasMany: true,
  label: "Variant Options",
  name: "options",
  relationTo: "variantOptions",
  required: false,
  type: "relationship",
  validate: validateVariantOptions,
  admin: {
    components: {
      Field:
        "@/payload/collections/products/fields/variant-options-selector/components/VariantOptionsSelector#VariantOptionsSelector",
    },
  },
});

export { variantOptionsSelectorField };
