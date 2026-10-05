import type { RelationshipField } from "payload";

import { validateVariantOptions } from "./validate";

const variantOptionsSelectorField = (): RelationshipField => ({
  name: "options",
  type: "relationship",
  hasMany: true,
  label: "Variant Options",
  relationTo: "variantOptions",
  required: false,
  validate: validateVariantOptions,
  admin: {
    components: {
      Field:
        "@/payload/collections/products/fields/variant-options-selector/components/VariantOptionsSelector#VariantOptionsSelector",
    },
  },
});

export { variantOptionsSelectorField };
