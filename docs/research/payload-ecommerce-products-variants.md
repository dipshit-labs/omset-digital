# PayloadCMS Ecommerce Plugin and Template: Products and Variants Architecture

**Author:** Technical Architecture Research  
**Date:** September 2026  
**Status:** Completed  
**Target Repository:** Omset Digital  

---

## 1. Executive Summary

PayloadCMS approaches ecommerce product catalog management by splitting the catalog into four distinct collections:

1. `products`: The top-level product document. Contains shared metadata, descriptions, category assignments, and optional variant enablement flags.
2. `variantTypes`: The axes of variation, such as Color or Size.
3. `variantOptions`: The discrete choices available on each axis, such as Red, Blue, Small, or Large.
4. `variants`: The concrete purchasable SKU documents. Represents a specific combination of variant options, holding independent inventory counts and currency-specific pricing.

The official template (`templates/ecommerce`) integrates `@payloadcms/plugin-ecommerce` by overriding the base products collection with custom fields (Lexical rich text, layout blocks, and a variant-linked image gallery), managing variant selection via URL search parameters in Next.js App Router client components, and synchronizing shopping carts with client-side React hooks.

This research analyzes the source code of both `@payloadcms/plugin-ecommerce` and `templates/ecommerce` from the primary Payload repository, documents the TypeScript typing patterns, and evaluates patterns relevant to Omset Digital.

---

## 2. Primary Sources Consulted

All findings in this document are drawn directly from the official Payload monorepo (`payloadcms/payload` on branch `main`):

- **Plugin core and configuration:**
  - `packages/plugin-ecommerce/src/index.ts`: Plugin entry point, collection initialization, and TypeScript schema injection.
  - `packages/plugin-ecommerce/src/types/index.ts`: Configuration types, collection overrides, and cart interfaces.
  - `packages/plugin-ecommerce/src/types/utilities.ts`: Module augmentation and type resolution utilities.
  - `packages/plugin-ecommerce/src/utilities/pushTypeScriptProperties.ts`: JSON Schema mutation for Payload code generation.
- **Plugin collection factories and fields:**
  - `packages/plugin-ecommerce/src/collections/products/createProductsCollection.ts`: Base products collection definition.
  - `packages/plugin-ecommerce/src/fields/variantsFields.ts`: Schema fields injected into products (`enableVariants`, `variantTypes`, `variants`).
  - `packages/plugin-ecommerce/src/collections/variants/createVariantTypesCollection.ts`: Variant types collection factory.
  - `packages/plugin-ecommerce/src/collections/variants/createVariantOptionsCollection.ts`: Variant options collection factory.
  - `packages/plugin-ecommerce/src/collections/variants/createVariantsCollection/index.ts`: Concrete variants collection factory.
  - `packages/plugin-ecommerce/src/collections/variants/createVariantsCollection/hooks/beforeChange.ts`: Auto-generated title hook.
  - `packages/plugin-ecommerce/src/collections/variants/createVariantsCollection/hooks/validateOptions.ts`: Option completeness and uniqueness validation.
  - `packages/plugin-ecommerce/src/fields/pricesField.ts` & `amountField.ts`: Multi-currency pricing schema.
  - `packages/plugin-ecommerce/src/fields/inventoryField.ts`: Inventory tracking field.
  - `packages/plugin-ecommerce/src/ui/VariantOptionsSelector/index.tsx`: Admin React Server Component for option selection.
- **Template configuration and collections:**
  - `templates/ecommerce/src/payload.config.ts`: Base Payload configuration.
  - `templates/ecommerce/src/plugins/index.ts`: Plugin registration and collection overrides.
  - `templates/ecommerce/src/collections/Products/index.ts`: Extended products collection with tabs, gallery, and layout blocks.
  - `templates/ecommerce/src/payload-types.ts`: Generated TypeScript interfaces for `Product`, `Variant`, `VariantType`, and `VariantOption`.
- **Template storefront implementation:**
  - `templates/ecommerce/src/app/(app)/products/[slug]/page.tsx`: RSC product detail page and data querying.
  - `templates/ecommerce/src/components/product/VariantSelector.tsx`: Client component managing option selection in the URL.
  - `templates/ecommerce/src/components/product/Gallery.tsx`: Carousel component synchronized with selected variant options.
  - `templates/ecommerce/src/components/product/ProductDescription.tsx`: Price range and stock calculations.
  - `templates/ecommerce/src/components/product/StockIndicator.tsx`: Real-time stock display based on active variant.
  - `templates/ecommerce/src/components/Cart/AddToCart.tsx`: Cart insertion and inventory check logic.
  - `templates/ecommerce/src/components/Cart/CartModal.tsx`: Slide-over cart displaying line items, variant labels, and matched images.
  - `templates/ecommerce/src/endpoints/seed/index.ts` & `product-tshirt.ts`: Local API seeding sequence for variant hierarchies.

---

## 3. Architecture of `@payloadcms/plugin-ecommerce` Products and Variants

### 3.1 Four-Collection Relational Model

Rather than embedding variant rows directly into an array inside the product document, `@payloadcms/plugin-ecommerce` separates concerns across four distinct collections.

```
+-------------------------------------------------------------+
|                        variantTypes                         |
|  - label: "Size"                                            |
|  - name: "size"                                             |
|  - options: join -> variantOptions (on "variantType")       |
+-------------------------------------------------------------+
                               ^
                               | (relationship)
+-------------------------------------------------------------+
|                       variantOptions                        |
|  - variantType: relationship -> variantTypes                |
|  - label: "Small"                                           |
|  - value: "small"                                           |
+-------------------------------------------------------------+
                               ^
                               | (hasMany relationship)
+------------------------+     |     +------------------------+
|        products        |     |     |        variants        |
|  - title               |     |     |  - title               |
|  - enableVariants      |     |     |  - product: rel        |
|  - variantTypes: rel[] |     |     |  - options: rel[]      |
|  - variants: join <----+-----+-----+-- (on "product")       |
|  - inventory (if !var) |           |  - inventory           |
|  - prices    (if !var) |           |  - prices              |
+------------------------+           +------------------------+
```

This separation solves three database architecture problems:

1. **Option reuse:** Common options such as colors and sizes are defined once and reused across different products.
2. **Independent document lifecycle:** Each variant has its own document ID, timestamps, drafts, trash, and access control checks.
3. **Array bloat prevention:** Products with large combinations of variants do not inflate a single document past BSON or PostgreSQL row size limits.

### 3.2 Collection Schemas in Detail

#### Products Collection (`createProductsCollection.ts` & `variantsFields.ts`)

The products collection defines three fields dedicated to variants:

- `enableVariants`: A boolean checkbox. When false, the product behaves as a standalone sellable item with its own direct `inventory` and `prices` fields.
- `variantTypes`: A `hasMany: true` relationship to `variantTypesSlug` (default: `'variantTypes'`). An admin condition hides this field unless `enableVariants` is true.
- `variants`: A Payload 3.x `join` field:
  - `collection`: `variantsSlug` (default: `'variants'`).
  - `on`: `'product'`.
  - `maxDepth`: 2.
  - Admin condition: Only renders when `enableVariants` is true and `variantTypes` contains at least one item.

Source implementation from `packages/plugin-ecommerce/src/fields/variantsFields.ts`:

```ts
export const variantsFields = ({
  variantsSlug = 'variants',
  variantTypesSlug = 'variantTypes',
}) => {
  return [
    {
      name: 'enableVariants',
      type: 'checkbox',
      label: ({ t }) => t('plugin-ecommerce:enableVariants'),
    },
    {
      name: 'variantTypes',
      type: 'relationship',
      admin: {
        condition: ({ enableVariants }) => Boolean(enableVariants),
      },
      hasMany: true,
      relationTo: variantTypesSlug,
    },
    {
      name: 'variants',
      type: 'join',
      admin: {
        condition: ({ enableVariants, variantTypes }) => {
          const enabledVariants = Boolean(enableVariants)
          const hasManyVariantTypes = Array.isArray(variantTypes) && variantTypes.length > 0
          return enabledVariants && hasManyVariantTypes
        },
        defaultColumns: ['title', 'options', 'inventory', 'prices', '_status'],
        disabled: { column: true },
      },
      collection: variantsSlug,
      maxDepth: 2,
      on: 'product',
    },
  ]
}
```

#### Variant Types Collection (`createVariantTypesCollection.ts`)

Represents the dimension of variation.

- `label`: Text field (e.g. "Size", "Color"). Used for display in the admin panel and storefront.
- `name`: Text field (e.g. "size", "color"). Used as a slug and URL query parameter key.
- `options`: A `join` field linking to `variantOptionsSlug` where `on: 'variantType'`, with `orderable: true` and `maxDepth: 2`.

#### Variant Options Collection (`createVariantOptionsCollection.ts`)

Represents the discrete option under a variant type.

- `variantType`: A relationship to `variantTypesSlug`, marked `readOnly: true` in the admin UI because options are created directly from the parent type's join view.
- `label`: Text field (e.g. "Small", "Navy Blue").
- `value`: Text field (e.g. "small", "navy-blue").

#### Variants Collection (`createVariantsCollection/index.ts`)

Represents the concrete SKU.

- `title`: Text field. Not exposed to customers. Auto-generated by a `beforeChange` hook.
- `product`: A relationship to `productsSlug`, located in the sidebar, marked `readOnly: true`, and required.
- `options`: A `hasMany: true` relationship to `variantOptionsSlug`. It uses a custom admin component and a custom validator:
  - Custom UI component: `@payloadcms/plugin-ecommerce/rsc#VariantOptionsSelector`.
  - Custom validator: `validateOptions({ productsCollectionSlug })`.
- `inventory`: A number field with minimum value 0.
- `prices`: Group field generated by `pricesField({ currenciesConfig })`. Contains subfields for each supported currency (e.g. `priceInUSDEnabled` and `priceInUSD`).
- Versions: Supports drafts and autosave (`versions: { drafts: { autosave: true } }`).

### 3.3 Hooks and Business Logic in Variants

#### Auto-generated Title Hook (`beforeChange.ts`)

When a variant document is created or updated, Payload invokes `variantsCollectionBeforeChange`. The hook queries the parent product's title and the labels of all assigned options, then joins them using a delimiter:

```ts
// From packages/plugin-ecommerce/src/collections/variants/createVariantsCollection/hooks/beforeChange.ts
export const variantsCollectionBeforeChange =
  ({ productsSlug, variantOptionsSlug }) =>
  async ({ data, req }) => {
    if (data?.options?.length && data.options.length > 0) {
      const titleArray: string[] = []
      const product = await req.payload.findByID({
        id: data.product,
        collection: productsSlug,
        depth: 0,
        select: { title: true, variantTypes: true },
      })

      if (product.title && typeof product.title === 'string') {
        titleArray.push(product.title)
      }

      for (const option of data.options) {
        const variantOption = await req.payload.findByID({
          id: option,
          collection: variantOptionsSlug,
          depth: 0,
          select: { label: true },
        })
        if (variantOption?.label) {
          titleArray.push(variantOption.label)
        }
      }

      data.title = titleArray.join(' — ')
    }
    return data
  }
```

This produces titles such as `Tshirt — Black — Small`, ensuring readable references in admin tables, carts, orders, and database queries.

#### Validation Hook (`validateOptions.ts`)

The `validateOptions` function runs before persisting variant options:

1. **Option completeness:** Checks that the number of selected options matches the number of `variantTypes` configured on the parent product:
   ```ts
   if (values.length < product?.variantTypes?.length) {
     return t('ecommerce:variantOptionsRequiredAll')
   }
   ```
2. **Option combination uniqueness:** Queries all existing non-deleted variants on the parent product, excluding the current variant ID. It checks whether an existing variant already has the identical set of option IDs:
   ```ts
   const exists = existingOptions.some(
     (combo) => combo.length === values.length && combo.every((val) => values.includes(val)),
   )
   if (exists) {
     return t('ecommerce:variantOptionsAlreadyExists')
   }
   ```

#### Admin Custom Component (`VariantOptionsSelector`)

Payload uses a React Server Component (`VariantOptionsSelector`) rendered inside the admin panel. Instead of presenting a generic multi-select box of all option IDs across the database, it loads the parent product's specific `variantTypes`, fetches the options for each type, and renders individual select dropdowns for each axis.

---

## 4. TypeScript Typing and Schema Augmentation

`@payloadcms/plugin-ecommerce` integrates with Payload's automatic TypeScript generation pipeline (`payload generate:types`) using two mechanisms: JSON Schema mutation and TypeScript module augmentation.

### 4.1 JSON Schema Mutation (`pushTypeScriptProperties.ts`)

Payload allows plugins to inject custom properties into the root JSON Schema used by `json-schema-to-typescript`. In `src/index.ts`, the plugin appends a callback to `incomingConfig.typescript.schema`:

```ts
incomingConfig.typescript.schema.push((args) =>
  pushTypeScriptProperties({
    ...args,
    collectionSlugMap,
    sanitizedPluginConfig,
  }),
)
```

Inside `pushTypeScriptProperties.ts`, the plugin registers an `ecommerce` object definition containing references to each collection slug:

```ts
export const pushTypeScriptProperties = ({
  collectionSlugMap,
  jsonSchema,
}) => {
  const propertiesMap = new Map<string, { $ref: string }>()

  Object.entries(collectionSlugMap).forEach(([key, slug]) => {
    propertiesMap.set(key, { $ref: `#/$defs/${slug}` })
    requiredCollectionProperties.push(slug)
  })

  jsonSchema.properties.ecommerce = {
    type: 'object',
    additionalProperties: false,
    description: 'Generated by the Payload Ecommerce plugin',
    properties: {
      collections: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ...Object.fromEntries(propertiesMap),
        },
        required: requiredCollectionProperties,
      },
    },
    required: ['collections'],
  }

  return jsonSchema
}
```

### 4.2 Module Augmentation (`types/utilities.ts`)

To provide type safety before `generate:types` has run, the plugin declares fallback untyped structures in `types/utilities.ts`:

```ts
type CartsUntyped = {
  [key: string]: any
  id: DefaultDocumentIDType
  items?: any[]
  subtotal?: number
}

type AddressesUntyped = {
  [key: string]: any
  id: DefaultDocumentIDType
}

type EcommerceBase = {
  collections: {
    addresses: AddressesUntyped
    carts: CartsUntyped
  }
}

type ResolveEcommerceType<T> = T extends { ecommerce: infer E }
  ? E
  : T extends { ecommerceUntyped: infer E }
    ? E
    : EcommerceBase

export type TypedEcommerce = EcommerceBase & ResolveEcommerceType<GeneratedTypes>

declare module 'payload' {
  export interface GeneratedTypes {
    ecommerceUntyped: {
      collections: {
        addresses: AddressesUntyped
        carts: CartsUntyped
      }
    }
  }
}
```

When code generation runs on a project with the plugin enabled, `GeneratedTypes` receives the concrete definitions of `ecommerce.collections.products`, `variants`, `orders`, and `carts`.

### 4.3 Concrete Generated Types in the Template (`payload-types.ts`)

In the consumer project, running `payload generate:types` outputs clean, strongly typed TypeScript interfaces.

#### Product Interface

```ts
export interface Product {
  id: string;
  title: string;
  description?: {
    root: {
      type: string;
      children: {
        type: any;
        version: number;
        [k: string]: unknown;
      }[];
      direction: ('ltr' | 'rtl') | null;
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
      indent: number;
      version: number;
    };
    [k: string]: unknown;
  } | null;
  gallery?: {
    image: string | Media;
    variantOption?: (string | null) | VariantOption;
    id?: string | null;
  }[] | null;
  layout?: (CallToActionBlock | ContentBlock | MediaBlock)[] | null;
  inventory?: number | null;
  enableVariants?: boolean | null;
  variantTypes?: (string | VariantType)[] | null;
  variants?: {
    docs?: (string | Variant)[];
    hasNextPage?: boolean;
    totalDocs?: number;
  };
  priceInUSDEnabled?: boolean | null;
  priceInUSD?: number | null;
  relatedProducts?: (string | Product)[] | null;
  meta?: {
    title?: string | null;
    image?: (string | null) | Media;
    description?: string | null;
  };
  categories?: (string | Category)[] | null;
  generateSlug?: boolean | null;
  slug: string;
  updatedAt: string;
  createdAt: string;
  deletedAt?: string | null;
  _status?: ('draft' | 'published') | null;
}
```

Notice the structure of `variants`: because it is a `join` field, Payload represents it as `{ docs?: (string | Variant)[]; hasNextPage?: boolean; totalDocs?: number }`.

#### Variant Interface

```ts
export interface Variant {
  id: string;
  title?: string | null;
  product: string | Product;
  options: (string | VariantOption)[];
  inventory?: number | null;
  priceInUSDEnabled?: boolean | null;
  priceInUSD?: number | null;
  updatedAt: string;
  createdAt: string;
  deletedAt?: string | null;
  _status?: ('draft' | 'published') | null;
}
```

#### VariantType and VariantOption Interfaces

```ts
export interface VariantType {
  id: string;
  label: string;
  name: string;
  options?: {
    docs?: (string | VariantOption)[];
    hasNextPage?: boolean;
    totalDocs?: number;
  };
  updatedAt: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface VariantOption {
  id: string;
  _variantOptions_options_order?: string | null;
  variantType: string | VariantType;
  label: string;
  value: string;
  updatedAt: string;
  createdAt: string;
  deletedAt?: string | null;
}
```

#### Cart and Order Item References

In both `Cart` and `Order`, line items reference both `product` and optional `variant`:

```ts
export interface Cart {
  id: string;
  items?: {
    product?: (string | null) | Product;
    variant?: (string | null) | Variant;
    quantity: number;
    id?: string | null;
  }[] | null;
  status?: ('active' | 'purchased' | 'abandoned') | null;
  subtotal?: number | null;
  currency?: 'USD' | null;
  // ...
}
```

---

## 5. Reference Implementation in `templates/ecommerce`

### 5.1 Extending Collections via Collection Overrides

The template configures `ecommercePlugin` inside `src/plugins/index.ts`. It provides an override for `products` via `productsCollectionOverride`:

```ts
ecommercePlugin({
  access: {
    adminOnlyFieldAccess,
    adminOrPublishedStatus,
    customerOnlyFieldAccess,
    isAdmin,
    isDocumentOwner,
  },
  customers: {
    slug: 'users',
  },
  products: {
    productsCollectionOverride: ProductsCollection,
  },
  // ...
})
```

The override in `src/collections/Products/index.ts` accepts `{ defaultCollection }` and restructures the admin layout into tabs:

1. **Content Tab:**
   - `description`: Rich text field powered by `@payloadcms/richtext-lexical`.
   - `gallery`: Array of images with a relationship to `variantOptions`.
   - `layout`: Dynamic blocks (`CallToAction`, `Content`, `MediaBlock`).
2. **Product Details Tab:**
   - Spreads `...defaultCollection.fields`, which includes the plugin's `enableVariants`, `variantTypes`, `variants`, `inventory`, and `pricesField`.
   - Adds `relatedProducts` relationship field.
3. **SEO Tab:**
   - Meta title, description, and image fields from `@payloadcms/plugin-seo`.

### 5.2 Variant-Linked Image Gallery

A notable pattern in `ProductsCollection` is binding individual images in the product gallery to specific variant options:

```ts
{
  name: 'gallery',
  type: 'array',
  minRows: 1,
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'variantOption',
      type: 'relationship',
      relationTo: 'variantOptions',
      admin: {
        condition: (data) => data?.enableVariants === true && data?.variantTypes?.length > 0,
      },
      filterOptions: ({ data }) => {
        if (data?.enableVariants && data?.variantTypes?.length) {
          const variantTypeIDs = data.variantTypes.map((item) =>
            typeof item === 'object' && item?.id ? item.id : item,
          )
          return {
            variantType: { in: variantTypeIDs },
          }
        }
        return { variantType: { in: [] } }
      },
    },
  ],
}
```

This lets an admin attach an image specifically to the "Black" or "White" color option. The storefront uses this relationship to switch images automatically when the buyer selects a variant.

### 5.3 Storefront Variant Selection and State Flow

The storefront relies on URL search parameters as the single source of truth for variant selection. This avoids client-side React state drift and enables shareable URLs.

```
Buyer clicks "White" -> URL updates to /products/tshirt?color=white_id
                                   |
           +-----------------------+-----------------------+
           |                                               |
           v                                               v
VariantSelector.tsx:                               Gallery.tsx:
1. Reads all URL params                            1. Reads URL params
2. Finds matching Variant in variants.docs         2. Matches option ID with gallery[i].variantOption
3. Updates URL with ?variant=variant_id            3. Scrolls carousel to that photo
4. Disables out-of-stock options                   
           |
           v
AddToCart.tsx:
1. Reads ?variant=variant_id
2. Checks variant.inventory
3. Calls addItem({ product: id, variant: variant_id })
```

#### URL State Synchronization in `VariantSelector.tsx`

The component iterates over `product.variantTypes`. For each option:

1. It creates a speculative `URLSearchParams` instance with that option set.
2. It tests whether any concrete variant in `product.variants.docs` matches the resulting combination of parameters.
3. If a variant matches and has `inventory > 0`, the option button is active. If `inventory === 0`, the button is marked out of stock.
4. Clicking an option calls `router.replace(optionUrl, { scroll: false })`.

#### Synchronized Carousel in `Gallery.tsx`

`Gallery.tsx` listens to `searchParams`. Whenever parameters change, it checks if any item in `gallery` has a `variantOption` matching one of the values in the search parameters. If a match is found, it calls `api.scrollTo(index, true)`.

#### Inventory Validation in `AddToCart.tsx`

`AddToCart.tsx` extracts `variantId` from `searchParams.get('variant')`. It finds the corresponding `Variant` object from `product.variants.docs`. The button disables under three conditions:

1. The product has variants enabled, but no valid variant is selected.
2. The selected variant has an inventory of zero.
3. The cart already contains a quantity equal to or greater than the available inventory.

### 5.4 Seed Sequence for Products and Variants

The template seed script (`templates/ecommerce/src/endpoints/seed/index.ts`) illustrates how to create variant data programmatically using Payload's Local API:

```ts
// 1. Create Variant Types
const sizeVariantType = await payload.create({
  collection: 'variantTypes',
  data: { name: 'size', label: 'Size' },
})

// 2. Create Variant Options
const small = await payload.create({
  collection: 'variantOptions',
  data: { label: 'Small', value: 'small', variantType: sizeVariantType.id },
})

// 3. Create Parent Product
const productTshirt = await payload.create({
  collection: 'products',
  data: {
    title: 'Tshirt',
    slug: 'tshirt',
    enableVariants: true,
    variantTypes: [sizeVariantType.id],
    gallery: [{ image: imageId, variantOption: small.id }],
    // ...
  },
})

// 4. Create Concrete Variants
await payload.create({
  collection: 'variants',
  data: {
    product: productTshirt.id,
    options: [small.id],
    inventory: 50,
    priceInUSDEnabled: true,
    priceInUSD: 4999,
    _status: 'published',
  },
})
```

---

## 6. Analysis and Recommendations for Omset Digital

Omset Digital's domain model defines `Product`, `SKU`, `Variant Axis`, and `Digital Asset` within a multi-tenant Bring-Your-Own-Key (BYOK) architecture. Comparing Payload's official plugin model with Omset Digital's architecture highlights key architectural differences:

| Architectural Dimension | Payload Ecommerce Plugin / Template | Omset Digital Domain & Requirements |
| :--- | :--- | :--- |
| **Domain Terminology** | Product -> Variant -> VariantType -> VariantOption | Product -> SKU -> Variant Axis -> Option Value |
| **Multi-Tenancy** | Single-tenant global collections. No tenant scoping on options. | Strict multi-tenant isolation. Every product, SKU, and option must be scoped to a Tenant. |
| **Storage Model** | Four separate collections linked via `join` and relationships. | Hybrid option: Dedicated collections or denormalized SKU arrays depending on query scale. |
| **Storefront Rendering** | Client components (`VariantSelector`, `Gallery`) reading URL search parameters. | Server-rendered themes (`@repo/theme-default`) consuming `StorefrontContent` and URL state. |
| **Payments Integration** | Single-tenant Stripe adapter using global server environment variables. | Multi-tenant BYOK payment adapters (Xendit) storing keys per tenant document. |

### 6.1 Patterns Worth Adopting

1. **URL-driven variant selection state:**  
   Handling option selection entirely via URL search parameters (`?size=m&color=black`) in `VariantSelector.tsx` is clean and robust. It provides deep-linkable URLs, avoids state loss on page reload, works with Next.js App Router caching, and simplifies analytics tracking.
2. **Variant-linked image galleries:**  
   The pattern of adding an optional `variantOption` relationship to each item in the product's `gallery` array enables reactive image switching when users pick colors or styles, without duplicating gallery definitions.
3. **Payload 3.x `join` fields for variants:**  
   Using Payload 3.x `type: 'join'` on the product collection avoids storing unbounded arrays of variant object IDs inside the parent document. Payload manages the reverse relationship cleanly in Postgres without document size bloat.
4. **Automated title generation on SKUs:**  
   Combining product titles and option labels in a `beforeChange` hook (`Product Name — Color — Size`) makes variants readable in admin relations, order summaries, and webhook payloads.
5. **Option completeness and combination uniqueness validation:**  
   Validating that every variant axis has an option, and preventing duplicate combinations with an asynchronous `validate` hook, protects the catalog against corrupt SKU combinations.

### 6.2 Patterns to Avoid or Adapt

1. **Avoid off-the-shelf `@payloadcms/plugin-ecommerce`:**  
   As documented in `docs/research/payload-plugins-evaluation.md`, the official plugin lacks multi-tenant BYOK support. Installing the plugin directly would introduce single-tenant schemas and global payment adapters that conflict with Omset Digital's tenant model.
2. **Add tenant scoping to variant axes:**  
   If implementing separate `variantTypes` and `variantOptions` collections, they must include a required `tenant` relationship with tenant-level read and write access controls. Otherwise, options from Merchant A would leak into Merchant B's selector.
3. **Evaluate Cartesian product generation for SKUs:**  
   Payload's plugin requires creating each variant manually or through seeds. For SME merchants managing clothing or footwear, an admin generator that creates the Cartesian product of selected axes (e.g. 3 sizes * 4 colors = 12 SKU draft rows) reduces repetitive manual entry.
4. **Digital asset integration:**  
   Payload's ecommerce plugin has no native concept of `Digital Asset` (downloadable files delivered via signed time-limited URLs). In Omset Digital, digital products require an upload relationship with access controls restricted to buyers with confirmed paid orders.
