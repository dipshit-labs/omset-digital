import { FieldError, FieldLabel } from "@payloadcms/ui";
import type { RelationshipFieldServerProps } from "payload";
import { extractID } from "@/payload/lib/ids";
import type {
  Product,
  VariantOption,
  VariantType,
} from "@/payload/payload-types";
import { OptionsSelect } from "./OptionsSelect";
import styles from "./VariantOptionsSelector.module.css";

export async function VariantOptionsSelector({
  clientField: { label },
  data,
  field,
  path,
  req,
  user,
}: RelationshipFieldServerProps) {
  const productId = data?.product
    ? extractID<Product>(data.product as Product | Product["id"])
    : undefined;

  if (!productId) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.heading}>
          <FieldLabel as="span" label={label} />
        </div>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Please select and save a product first to configure variants.
        </p>
      </div>
    );
  }

  const product = await req.payload.findByID({
    collection: "products",
    depth: 0,
    draft: true,
    id: productId,
    overrideAccess: false,
    select: { variantTypes: true },
    user,
  });

  const variantTypeIDs = Array.isArray(product.variantTypes)
    ? product.variantTypes.map((type) =>
        extractID<VariantType>(type as VariantType | VariantType["id"])
      )
    : [];

  const variantTypes = await Promise.all(
    variantTypeIDs.map((id) =>
      req.payload.findByID({
        id,
        collection: "variantTypes",
        depth: 1,
        joins: { options: { sort: "label" } },
        overrideAccess: false,
        populate: { variantOptions: { label: true } },
        select: { label: true, name: true, options: true },
        user,
      })
    )
  ).then((results) => results.filter(Boolean));

  const existingVariants = await req.payload.find({
    collection: "variants",
    depth: 0,
    draft: true,
    limit: 0,
    overrideAccess: false,
    select: {
      options: true,
    },
    user,
    where: {
      and: [
        { product: { equals: productId } },
        ...(data?.id ? [{ id: { not_equals: data.id } }] : []),
      ],
    },
  });

  const existingCombinations = existingVariants.docs.map((variant) =>
    Array.isArray(variant.options)
      ? variant.options.map((opt) =>
          extractID<VariantOption>(opt as VariantOption | VariantOption["id"])
        )
      : []
  );

  const variantTypesData = variantTypes.map((variantType) => ({
    id: variantType.id,
    label: variantType.label || variantType.name,
    options:
      variantType.options?.docs
        ?.filter(
          (opt): opt is VariantOption => typeof opt === "object" && opt !== null
        )
        .map((option) => ({
          label: option.label,
          value: option.id,
        })) ?? [],
  }));

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <FieldLabel as="span" label={label} />
      </div>

      <div className={styles.error}>
        <FieldError path={path} />
        <OptionsSelect
          existingCombinations={existingCombinations}
          path={path}
          required={field.required}
          variantTypes={variantTypesData}
        />
      </div>
    </div>
  );
}
