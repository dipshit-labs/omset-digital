import type { GroupField, NumberField, Option, SelectField } from "payload";
import { type MeasurementType, UNIT_PRESETS } from "./constants";

export interface MeasurementFieldOverrides {
  unitOverrides?: Partial<SelectField>;
  valueOverrides?: Partial<NumberField>;
}

interface MeasurementFieldParams {
  label?: string;
  name: string;
  overrides?: MeasurementFieldOverrides;
  required?: boolean;
  type: MeasurementType | Option[];
}

const measurementField = ({
  name,
  label,
  type,
  overrides = {},
  required = false,
}: MeasurementFieldParams): GroupField => {
  const { valueOverrides, unitOverrides } = overrides;

  const options = typeof type === "string" ? UNIT_PRESETS[type] : type;
  const fallbackDefault =
    typeof options[0] === "string" ? options[0] : options[0]?.value;

  const valueField: NumberField = {
    name: "value",
    type: "number",
    label,
    defaultValue: 0,
    min: 0,
    required,
    ...valueOverrides,
    admin: {
      placeholder: "0",
      ...(valueOverrides?.admin || {}),
    },
  } as NumberField;

  const unitField: SelectField = {
    defaultValue: fallbackDefault,
    label: false,
    name: "unit",
    type: "select",
    required,
    ...unitOverrides,
    options: options as Option[],
    admin: {
      isClearable: false,
      width: "35%",
      style: {
        alignSelf: "end",
      },
      ...(unitOverrides?.admin || {}),
    },
  } as SelectField;

  return {
    name,
    label: false,
    type: "group",
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        fields: [valueField, unitField],
        type: "row",
      },
    ],
  };
};

export { measurementField };
