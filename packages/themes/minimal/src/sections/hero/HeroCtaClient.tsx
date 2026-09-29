"use client";

import { Link } from "@repo/theme-core/primitives";
import { cn } from "@repo/theme-core/utils";
import type { MouseEvent, ReactElement } from "react";

export interface HeroCtaClientProps {
  className?: string;
  label?: string;
  newTab?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  url: string;
}

export const HeroCtaClient = ({
  className,
  label = "Explore",
  newTab,
  onClick,
  url,
}: HeroCtaClientProps): ReactElement => (
  <Link
    className={cn(
      "border-foreground text-foreground hover:bg-foreground hover:text-background inline-flex items-center rounded-none border px-6 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors duration-200",
      className
    )}
    href={url}
    onClick={onClick}
    rel={newTab ? "noreferrer" : undefined}
    target={newTab ? "_blank" : undefined}
  >
    {label}
  </Link>
);
