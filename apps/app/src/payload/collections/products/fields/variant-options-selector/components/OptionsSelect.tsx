"use client";

import {
  FieldLabel,
  ReactSelect,
  type ReactSelectOption,
  useField,
} from "@payloadcms/ui";
import type { VariantOption } from "@repo/types";
import { useCallback, useEffect, useMemo } from "react";
import { extractID } from "@/payload/lib/ids";
import styles from "./OptionsSelect.module.css";

export interface VariantTypeConfig {
  id: number | string;
  label: string;
  options: ReactSelectOption[];
}

export interface OptionsSelectProps {
  existingCombinations: (number | string)[][];
  path: string;
  required?: boolean;
  variantTypes: VariantTypeConfig[];
}

interface OptionSelectRowProps {
  filteredOptions: ReactSelectOption[];
  inputId: string;
  label: string;
  onChange: (
    typeIndex: number,
    selected: ReactSelectOption | ReactSelectOption[] | null
  ) => void;
  required?: boolean;
  selectedValue?: ReactSelectOption;
  typeIndex: number;
}

function OptionSelectRow({
  filteredOptions,
  inputId,
  label,
  onChange,
  required,
  selectedValue,
  typeIndex,
}: OptionSelectRowProps) {
  const handleSelect = useCallback(
    (selected: ReactSelectOption | ReactSelectOption[] | null) => {
      onChange(typeIndex, selected);
    },
    [onChange, typeIndex]
  );

  return (
    <div className={styles["options-select"]}>
      <FieldLabel htmlFor={inputId} label={label} required={required} />
      <ReactSelect
        inputId={inputId}
        isClearable
        onChange={handleSelect}
        options={filteredOptions}
        value={selectedValue}
      />
    </div>
  );
}

function canFormValidCombination(
  optionValue: unknown,
  candidateChoices: unknown[][],
  existingSet: Set<string>,
  choiceIndex = 0,
  currentCombo: unknown[] = []
): boolean {
  if (choiceIndex === candidateChoices.length) {
    const fullCombo = [optionValue, ...currentCombo]
      .map(String)
      .sort()
      .join(",");
    return !existingSet.has(fullCombo);
  }

  for (const choice of candidateChoices[choiceIndex]) {
    if (
      canFormValidCombination(
        optionValue,
        candidateChoices,
        existingSet,
        choiceIndex + 1,
        [...currentCombo, choice]
      )
    ) {
      return true;
    }
  }

  return false;
}

function getFilteredOptions({
  currentTypeIndex,
  existingSet,
  rawValues,
  variantTypes,
}: {
  currentTypeIndex: number;
  existingSet: Set<string>;
  rawValues: (number | string)[];
  variantTypes: VariantTypeConfig[];
}): ReactSelectOption[] {
  const currentType = variantTypes[currentTypeIndex];
  if (!currentType) {
    return [];
  }

  const otherTypes = variantTypes.filter((_, idx) => idx !== currentTypeIndex);

  return currentType.options.filter((option) => {
    const candidateChoices = otherTypes.map((ot) => {
      const selectedForOt = ot.options.find((o) =>
        rawValues.some((sv) => String(sv) === String(o.value))
      );
      return selectedForOt
        ? [selectedForOt.value]
        : ot.options.map((o) => o.value);
    });

    return canFormValidCombination(option.value, candidateChoices, existingSet);
  });
}

function computeNextSelections({
  currentRawValues,
  existingSet,
  selectedOption,
  typeIndex,
  variantTypes,
}: {
  currentRawValues: (number | string)[];
  existingSet: Set<string>;
  selectedOption: ReactSelectOption | ReactSelectOption[] | null;
  typeIndex: number;
  variantTypes: VariantTypeConfig[];
}): (number | string)[] {
  const currentType = variantTypes[typeIndex];
  const typeOptionValues = new Set(
    currentType.options.map((o) => String(o.value))
  );

  let next = currentRawValues.filter(
    (item) => !typeOptionValues.has(String(item))
  );

  if (
    selectedOption &&
    !Array.isArray(selectedOption) &&
    (typeof selectedOption.value === "string" ||
      typeof selectedOption.value === "number")
  ) {
    next.push(selectedOption.value);
  }

  for (let i = 0; i < variantTypes.length; i += 1) {
    if (i === typeIndex) {
      continue;
    }
    const ot = variantTypes[i];
    const otSelected = ot.options.find((o) =>
      next.some((v) => String(v) === String(o.value))
    );
    if (otSelected) {
      const validOptions = getFilteredOptions({
        currentTypeIndex: i,
        existingSet,
        rawValues: next,
        variantTypes,
      });
      if (
        !validOptions.some((o) => String(o.value) === String(otSelected.value))
      ) {
        next = next.filter((v) => String(v) !== String(otSelected.value));
      }
    }
  }

  return next;
}

export function OptionsSelect({
  existingCombinations,
  path,
  required,
  variantTypes,
}: OptionsSelectProps) {
  const { setValue, value } = useField<
    (number | string | { id: number | string })[]
  >({ path });

  const rawValues = useMemo(() => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((v) =>
      extractID<VariantOption>(v as VariantOption | VariantOption["id"])
    );
  }, [value]);

  const existingSet = useMemo(
    () =>
      new Set(
        existingCombinations.map((combo) => combo.map(String).sort().join(","))
      ),
    [existingCombinations]
  );

  useEffect(() => {
    let hasInvalid = false;
    let current = [...rawValues];
    for (let i = 0; i < variantTypes.length; i += 1) {
      const vt = variantTypes[i];
      const selected = vt.options.find((o) =>
        current.some((v) => String(v) === String(o.value))
      );
      if (selected) {
        const valid = getFilteredOptions({
          currentTypeIndex: i,
          existingSet,
          rawValues: current,
          variantTypes,
        });
        if (!valid.some((o) => String(o.value) === String(selected.value))) {
          current = current.filter((v) => String(v) !== String(selected.value));
          hasInvalid = true;
        }
      }
    }
    if (hasInvalid) {
      setValue(current);
    }
  }, [existingSet, rawValues, setValue, variantTypes]);

  const handleChange = useCallback(
    (
      typeIndex: number,
      selected: ReactSelectOption | ReactSelectOption[] | null
    ) => {
      const nextValues = computeNextSelections({
        currentRawValues: rawValues,
        existingSet,
        selectedOption: selected,
        typeIndex,
        variantTypes,
      });
      setValue(nextValues);
    },
    [existingSet, rawValues, setValue, variantTypes]
  );

  return (
    <div className={styles.list}>
      {variantTypes.map((variantType, typeIndex) => {
        const inputId = `variant-type-${variantType.id}`;
        const filteredOptions = getFilteredOptions({
          currentTypeIndex: typeIndex,
          existingSet,
          rawValues,
          variantTypes,
        });

        const typeOptionValues = new Set(
          variantType.options.map((o) => String(o.value))
        );
        const matchedId = rawValues.find((v) =>
          typeOptionValues.has(String(v))
        );
        const selectedValue = filteredOptions.find(
          (opt) => String(opt.value) === String(matchedId)
        );

        return (
          <OptionSelectRow
            filteredOptions={filteredOptions}
            inputId={inputId}
            key={variantType.id}
            label={variantType.label}
            onChange={handleChange}
            required={required}
            selectedValue={selectedValue}
            typeIndex={typeIndex}
          />
        );
      })}
    </div>
  );
}
