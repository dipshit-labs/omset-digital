"use client";

import type { HTMLAttributes, ReactElement, ReactNode } from "react";

import { Fragment } from "react";

import { cn } from "../utils/cn";

export interface VariantOptionValueObject {
  disabled?: boolean;
  value: string;
}

export type VariantOptionValue = string | VariantOptionValueObject;

export interface VariantOptionGroup {
  name: string;
  values: VariantOptionValue[];
}

export interface VariantSelectorProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  groupClassName?: string;
  labelClassName?: string;
  onSelectOption?: (groupName: string, value: string) => void;
  optionButtonClassName?: string;
  options: VariantOptionGroup[];
  renderOption?: (props: {
    disabled: boolean;
    group: string;
    isSelected: boolean;
    select: () => void;
    value: string;
  }) => ReactNode;
  selectedOptions?: Record<string, string>;
  valuesContainerClassName?: string;
}

const EMPTY_SELECTED_OPTIONS: Record<string, string> = {};

export const VariantSelector = ({
  className,
  groupClassName,
  labelClassName,
  onSelectOption,
  optionButtonClassName,
  options,
  renderOption,
  selectedOptions = EMPTY_SELECTED_OPTIONS,
  valuesContainerClassName,
  ...props
}: VariantSelectorProps): ReactElement => (
  <div
    className={cn("flex flex-col gap-4", className)}
    data-slot="variant-selector"
    {...props}
  >
    {options.map((group) => {
      const selectedValue = selectedOptions[group.name];

      return (
        <fieldset
          className={cn("flex flex-col gap-2", groupClassName)}
          data-slot="variant-group"
          key={group.name}
        >
          <legend
            className={cn("text-sm font-medium", labelClassName)}
            data-slot="variant-label"
          >
            {group.name}
          </legend>
          <div
            className={cn("flex flex-wrap gap-2", valuesContainerClassName)}
            data-slot="variant-values"
          >
            {group.values.map((rawVal) => {
              const isObject = typeof rawVal === "object" && rawVal !== null;
              const value = isObject ? rawVal.value : rawVal;
              const disabled = Boolean(isObject && rawVal.disabled);
              const isSelected = selectedValue === value;

              const select = () => {
                if (!disabled) {
                  onSelectOption?.(group.name, value);
                }
              };

              if (renderOption) {
                return (
                  <Fragment key={value}>
                    {renderOption({
                      disabled,
                      group: group.name,
                      isSelected,
                      select,
                      value,
                    })}
                  </Fragment>
                );
              }

              return (
                <label
                  className={cn(
                    "cursor-pointer",
                    disabled && "cursor-not-allowed opacity-50",
                    optionButtonClassName
                  )}
                  data-selected={isSelected ? "" : undefined}
                  data-slot="variant-option"
                  data-state={isSelected ? "checked" : "unchecked"}
                  key={value}
                >
                  <input
                    aria-label={value}
                    checked={isSelected}
                    className="sr-only"
                    disabled={disabled}
                    name={group.name}
                    onChange={select}
                    type="radio"
                    value={value}
                  />
                  <span>{value}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    })}
  </div>
);
