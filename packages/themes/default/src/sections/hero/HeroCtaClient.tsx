"use client";

import { cn } from "@repo/ui/lib/utils";
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
  <a
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
  </a>
);
