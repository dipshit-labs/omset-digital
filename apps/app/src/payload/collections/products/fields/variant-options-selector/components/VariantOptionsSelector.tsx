import { FieldError, FieldLabel } from "@payloadcms/ui";
import type { RelationshipFieldServerProps } from "payload";
import type { VariantOption } from "@/payload/payload-types";
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
  const productId =
    typeof data?.product === "object" ? data.product?.id : data?.product;

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
        typeof type === "object" ? type.id : type
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
        user,
        populate: { variantOptions: { label: true } },
        select: { label: true, name: true, options: true },
      })
    )
  ).then((results) => results.filter(Boolean));

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <FieldLabel as="span" label={label} />
      </div>

      <div className={styles.error}>
        <FieldError path={path} />
        <div className={styles.list}>
          {variantTypes.map((variantType) => {
            const options =
              variantType.options?.docs
                ?.filter(
                  (opt): opt is VariantOption =>
                    typeof opt === "object" && opt !== null
                )
                .map((option) => ({
                  label: option.label,
                  value: option.id,
                })) ?? [];

            return (
              <OptionsSelect
                key={variantType.id}
                label={variantType.label}
                options={options}
                path={path}
                required={field.required}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
