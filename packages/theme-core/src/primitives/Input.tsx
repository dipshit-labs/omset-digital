import type { ComponentProps, ReactElement } from "react";

import { Input as BaseUIInput } from "@base-ui/react/input";

import { cn } from "../utils/cn";

export type InputProps = ComponentProps<"input">;

export const Input = ({
  className,
  type,
  ...props
}: InputProps): ReactElement => (
  <BaseUIInput
    type={type}
    data-slot="input"
    className={cn(
      "w-full min-w-0 transition-colors outline-none file:inline-flex disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);
