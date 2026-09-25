import type { GroupField, NumberField, Option, SelectField } from "payload";

import { UNIT_PRESETS } from "./constants";
import type { MeasurementType } from "./constants";

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
    defaultValue: 0,
    label,
    min: 0,
    name: "value",
    required,
    type: "number",
    ...valueOverrides,
    admin: {
      placeholder: "0",
      ...valueOverrides?.admin,
    },
  } as NumberField;

  // SAFETY: unitOverrides preserves field type and options conform to the Option array contract.
  const unitField: SelectField = {
    defaultValue: fallbackDefault,
    label: false,
    name: "unit",
    required,
    type: "select",
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
    label: false,
    name,
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
