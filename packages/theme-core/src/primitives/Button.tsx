import type { ReactElement } from "react";

import { Button as BaseUIButton } from "@base-ui/react/button";

export type ButtonProps = BaseUIButton.Props;

export const Button = ({ ...props }: ButtonProps): ReactElement => (
  <BaseUIButton data-slot="button" {...props} />
);
