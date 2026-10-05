import type { GroupField, NumberField, Option, SelectField } from "payload";
import type { MeasurementType } from "./constants";

import { UNIT_PRESETS } from "./constants";

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
  label,
  name,
  overrides = {},
  required = false,
  type,
}: MeasurementFieldParams): GroupField => {
  const { unitOverrides, valueOverrides } = overrides;

  const options = typeof type === "string" ? UNIT_PRESETS[type] : type;
  const fallbackDefault =
    typeof options[0] === "string" ? options[0] : options[0]?.value;

  // SAFETY: valueOverrides does not override field type; spread preserves NumberField compatibility.
  const valueField: NumberField = {
    name: "value",
    type: "number",
    defaultValue: 0,
    label,
    min: 0,
    required,
    ...valueOverrides,
    admin: {
      placeholder: "0",
      ...valueOverrides?.admin,
    },
  } as NumberField;

  // SAFETY: unitOverrides preserves field type and options conform to the Option array contract.
  const unitField: SelectField = {
    name: "unit",
    type: "select",
    defaultValue: fallbackDefault,
    label: false,
    required,
    ...unitOverrides,
    options: options as Option[],
    admin: {
      isClearable: false,
      width: "35%",
      style: {
        alignSelf: "end",
      },
      ...unitOverrides?.admin,
    },
  } as SelectField;

  return {
    name,
    type: "group",
    label: false,
    admin: {
      hideGutter: true,
    },
    fields: [
      {
        type: "row",
        fields: [valueField, unitField],
      },
    ],
  };
};

export { measurementField };
