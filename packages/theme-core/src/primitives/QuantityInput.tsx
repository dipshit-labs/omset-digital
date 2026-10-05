"use client";

import type {
  ChangeEvent,
  FocusEvent,
  HTMLAttributes,
  KeyboardEvent,
  ReactElement,
  ReactNode,
} from "react";

import { useCallback, useState } from "react";

import { cn } from "../utils/cn";

export interface QuantityInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  buttonClassName?: string;
  decrementAriaLabel?: string;
  decrementContent?: ReactNode;
  defaultValue?: number;
  disabled?: boolean;
  incrementAriaLabel?: string;
  incrementContent?: ReactNode;
  inputAriaLabel?: string;
  inputClassName?: string;
  max?: number;
  min?: number;
  onChange?: (value: number) => void;
  step?: number;
  value?: number;
}

export const QuantityInput = ({
  buttonClassName,
  className,
  decrementAriaLabel = "Decrease quantity",
  decrementContent = "-",
  defaultValue = 1,
  disabled = false,
  incrementAriaLabel = "Increase quantity",
  incrementContent = "+",
  inputAriaLabel = "Quantity",
  inputClassName,
  max,
  min = 1,
  onChange,
  step = 1,
  value: controlledValue,
  ...props
}: QuantityInputProps): ReactElement => {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<number>(defaultValue);
  const current = isControlled ? controlledValue : internalValue;

  const clamp = useCallback(
    (val: number): number => {
      let next = val;
      if (min !== undefined && next < min) {
        next = min;
      }
      if (max !== undefined && next > max) {
        next = max;
      }
      return next;
    },
    [min, max]
  );

  const commitValue = useCallback(
    (val: number) => {
      const next = clamp(val);
      if (!isControlled) {
        setInternalValue(next);
      }
      onChange?.(next);
    },
    [clamp, isControlled, onChange]
  );

  const handleIncrement = () => {
    if (disabled) {
      return;
    }
    commitValue(current + step);
  };

  const handleDecrement = () => {
    if (disabled) {
      return;
    }
    commitValue(current - step);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    const raw = event.target.value;
    if (raw === "") {
      return;
    }
    const parsed = Math.trunc(Number(raw));
    if (!Number.isNaN(parsed)) {
      commitValue(parsed);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    const raw = event.target.value;
    if (raw === "") {
      commitValue(min ?? 1);
      return;
    }
    const parsed = Math.trunc(Number(raw));
    commitValue(Number.isNaN(parsed) ? (min ?? 1) : parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleIncrement();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      handleDecrement();
    }
  };

  const isMinDisabled = disabled || (min !== undefined && current <= min);
  const isMaxDisabled = disabled || (max !== undefined && current >= max);

  return (
    <div
      className={cn("inline-flex items-center", className)}
      data-slot="quantity-input"
      {...props}
    >
      <button
        aria-label={decrementAriaLabel}
        className={cn(buttonClassName)}
        data-slot="quantity-decrement"
        disabled={isMinDisabled}
        onClick={handleDecrement}
        type="button"
      >
        {decrementContent}
      </button>
      <input
        aria-label={inputAriaLabel}
        className={cn(inputClassName)}
        data-slot="quantity-input-field"
        disabled={disabled}
        max={max}
        min={min}
        onBlur={handleBlur}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        step={step}
        type="number"
        value={current}
      />
      <button
        aria-label={incrementAriaLabel}
        className={cn(buttonClassName)}
        data-slot="quantity-increment"
        disabled={isMaxDisabled}
        onClick={handleIncrement}
        type="button"
      >
        {incrementContent}
      </button>
    </div>
  );
};
