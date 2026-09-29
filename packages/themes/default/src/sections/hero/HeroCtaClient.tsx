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
  label = "Learn More",
  newTab,
  onClick,
  url,
}: HeroCtaClientProps): ReactElement => (
  <Link
    className={cn(
      "bg-primary text-primary-foreground inline-flex items-center rounded-lg px-6 py-3 text-base font-medium shadow-sm transition hover:opacity-90",
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
