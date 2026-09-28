import NextLink from "next/link";
import type { AnchorHTMLAttributes, ReactElement } from "react";

import { cn } from "../utils/cn";
import { isNextJsEnvironment } from "../utils/isNextJs";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  adapter?: "auto" | "html" | "next";
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}

export const Link = ({
  adapter = "auto",
  children,
  className,
  href,
  prefetch,
  replace,
  scroll,
  ...props
}: LinkProps): ReactElement => {
  const useNext =
    adapter === "next" || (adapter === "auto" && isNextJsEnvironment());

  if (useNext) {
    return (
      <NextLink
        className={cn(className)}
        data-slot="link"
        href={href}
        prefetch={prefetch}
        replace={replace}
        scroll={scroll}
        {...props}
      >
        {children}
      </NextLink>
    );
  }

  return (
    <a className={cn(className)} data-slot="link" href={href} {...props}>
      {children}
    </a>
  );
};
