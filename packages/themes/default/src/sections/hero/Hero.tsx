import type { SectionProps } from "@repo/theme-core";
import { cn } from "@repo/theme-core/utils";
import type { ReactElement } from "react";

import { HeroCtaClient } from "./HeroCtaClient";

export interface HeroSettings {
  alignment?: "center" | "left";
  cta?: {
    label?: string;
    newTab?: boolean;
    url?: string;
  };
  heading: string;
  subheading?: string;
}

export interface HeroBulletBlock {
  blockType: "bullet";
  icon?: string;
  text: string;
}

const renderBulletIcon = (icon?: string): string => {
  switch (icon) {
    case "heart": {
      return "♥";
    }
    case "star": {
      return "★";
    }
    default: {
      return "✓";
    }
  }
};

export const Hero = ({
  blocks,
  settings,
}: SectionProps<HeroSettings, HeroBulletBlock>): ReactElement => {
  const isCentered = settings?.alignment === "center";

  return (
    <section
      className={cn("px-6 py-20", isCentered ? "text-center" : "text-left")}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          {settings?.heading || "Welcome"}
        </h1>
        {settings?.subheading && (
          <p className="text-muted-foreground text-lg sm:text-xl">
            {settings.subheading}
          </p>
        )}
        {settings?.cta?.url && (
          <div
            className={cn(
              "pt-4",
              isCentered ? "flex justify-center" : "flex justify-start"
            )}
          >
            <HeroCtaClient
              label={settings.cta.label}
              newTab={settings.cta.newTab}
              url={settings.cta.url}
            />
          </div>
        )}
        {blocks && blocks.length > 0 && (
          <ul
            className={cn(
              "mt-8 flex flex-wrap gap-4",
              isCentered ? "justify-center" : "justify-start"
            )}
          >
            {blocks.map((block, idx) => (
              <li
                className="text-muted-foreground flex items-center gap-2 text-sm"
                key={`${block.text}-${idx}`}
              >
                <span
                  aria-hidden="true"
                  className="bg-success-subtle text-success-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
                >
                  {renderBulletIcon(block.icon)}
                </span>
                <span>{block.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
