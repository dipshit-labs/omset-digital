"use client";

import { Button, toast, useField, useFormFields } from "@payloadcms/ui";
import type { ClientFieldProps, FormState } from "payload";
import { reduceFieldsToValues } from "payload/shared";
import React, { useCallback } from "react";

interface Axis {
  id: string;
  name: string;
  values: string[];
}

function cartesian(sets: string[][]): string[][] {
  return sets.reduce<string[][]>(
    (acc, set) => acc.flatMap((combo) => set.map((v) => [...combo, v])),
    [[]]
  );
}

const BuildVariantsButton = ({ path }: { path: string } & ClientFieldProps) => {
  const { setValue } = useField({ path });

  const axisFields = useFormFields(([fields]) =>
    Object.entries(fields)
      .filter(([key]) => key.startsWith("variantAxes."))
      .reduce<FormState>((acc, [key, field]) => {
        acc[key] = field;
        return acc;
      }, {})
  );

  const fieldDispatch = useFormFields(([, dispatch]) => dispatch);

  const { variantAxes } = (reduceFieldsToValues(axisFields, true) || {}) as {
    variantAxes?: Axis[];
  };

  const handleBuild = useCallback(() => {
    const axes = (variantAxes ?? []).filter(
      (a) => a.name && Array.isArray(a.values) && a.values.length > 0
    );

    if (axes.length === 0) {
      toast.warning("Add at least one variant axis with values first.");
      return;
    }

    const combinations = cartesian(axes.map((a) => a.values));

    combinations.forEach((combo, index) => {
      fieldDispatch({ path: "variants", rowIndex: index, type: "ADD_ROW" });

      axes.forEach((axis, axisIndex) => {
        fieldDispatch({
          path: `variants.${index}.options.${axisIndex}.option`,
          type: "UPDATE",
          value: axis.name,
        });
        fieldDispatch({
          path: `variants.${index}.options.${axisIndex}.value`,
          type: "UPDATE",
          value: combo[axisIndex],
        });
      });
    });

    toast.success(`Generated ${combinations.length} variant row(s).`);
    setValue("");
  }, [fieldDispatch, variantAxes, setValue]);

  return (
    <Button buttonStyle="secondary" onClick={handleBuild} size="small">
      Generate Variants
    </Button>
  );
};

export default React.memo(BuildVariantsButton);
