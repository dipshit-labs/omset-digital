import type { RowLabelProps } from "@payloadcms/ui";
import type { ArrayFieldServerProps } from "payload";

const VariantRowLabel = (
  props: { rowLabel: string } & ArrayFieldServerProps & RowLabelProps
) => {
  const { data } = props;
  const variants =
    data &&
    typeof data === "object" &&
    "variants" in data &&
    Array.isArray(data.variants)
      ? (data.variants as unknown[])
      : null;

  const row = variants?.[(props.rowNumber as number) - 1];
  const options =
    row &&
    typeof row === "object" &&
    "options" in row &&
    Array.isArray(row.options)
      ? (row.options as Array<{ option?: string; value?: string }>)
      : null;

  if (!options || options.length === 0) {
    return <p>{props.rowLabel}</p>;
  }

  const label = options
    .map((o) => o.value)
    .filter(Boolean)
    .join(" / ");

  const price =
    row &&
    typeof row === "object" &&
    "price" in row &&
    typeof row.price === "number"
      ? ` · Rp${row.price.toLocaleString("id-ID")}`
      : "";

  return (
    <p>
      {label}
      {price}
    </p>
  );
};

export default VariantRowLabel;
