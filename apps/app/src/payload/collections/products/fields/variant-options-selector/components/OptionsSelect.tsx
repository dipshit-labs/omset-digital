"use client";

import {
  FieldLabel,
  ReactSelect,
  type ReactSelectOption,
  useField,
} from "@payloadcms/ui";

import { useCallback, useId, useMemo } from "react";
import styles from "./OptionsSelect.module.css";

interface OptionsSelectProps {
  label: string;
  options: ReactSelectOption[];
  path: string;
  required?: boolean;
}

function OptionsSelect({ label, options, path, required }: OptionsSelectProps) {
  const id = useId();
  const { setValue, value } = useField<(number | string)[]>({ path });

  const rawValues = useMemo(() => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((v) =>
      typeof v === "object" && v !== null ? (v as any).id : v
    );
  }, [value]);

  const selectedValue = useMemo<ReactSelectOption | undefined>(() => {
    const optionValues = new Set(options.map((o) => String(o.value)));
    const matchedId = rawValues.find((v) => optionValues.has(String(v)));
    return options.find((opt) => String(opt.value) === String(matchedId));
  }, [options, rawValues]);

  const handleChange = useCallback(
    (selected: any) => {
      if (!selected) {
        return;
      }

      const current = [...rawValues];
      const optionValues = new Set(options.map((o) => String(o.value)));

      const filtered = current.filter((id) => !optionValues.has(String(id)));
      filtered.push(selected.value);

      setValue(filtered);
    },
    [options, rawValues, setValue]
  );

  return (
    <div className={styles["options-select"]}>
      <FieldLabel htmlFor={id} label={label} required={required} />
      <ReactSelect
        inputId={id}
        onChange={handleChange}
        options={options}
        value={selectedValue}
      />
    </div>
  );
}

export { OptionsSelect };
