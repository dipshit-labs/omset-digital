import type { SectionProps } from "@repo/theme-core";
import { cn } from "@repo/theme-core/utils";
import type { ReactElement } from "react";

import { HeroCtaClient } from "./HeroCtaClient";

export interface HeroSettings {
  cta?: {
    label?: string;
    newTab?: boolean;
    url?: string;
  };
  eyebrow?: string;
  heading: string;
  subheading?: string;
}

export interface HeroTagBlock {
  blockType: "tag";
  label: string;
}

export const Hero = ({
  blocks,
  settings,
}: SectionProps<HeroSettings, HeroTagBlock>): ReactElement => (
  <section
    className={cn(
      "border-border/60 mx-auto max-w-5xl border-b px-6 py-24 sm:py-32"
    )}
  >
    <div className="flex flex-col items-start gap-8">
      {settings?.eyebrow && (
        <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          {settings.eyebrow}
        </span>
      )}

      <h1 className="text-foreground max-w-3xl text-4xl font-light tracking-tight sm:text-6xl md:text-7xl">
        {settings?.heading || "Simplicity in Form"}
      </h1>

      {settings?.subheading && (
        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">
          {settings.subheading}
        </p>
      )}

      {settings?.cta?.url && (
        <div className="pt-2">
          <HeroCtaClient
            label={settings.cta.label}
            newTab={settings.cta.newTab}
            url={settings.cta.url}
          />
        </div>
      )}

      {blocks && blocks.length > 0 && (
        <div className="border-border/40 mt-6 flex flex-wrap gap-2 border-t pt-6">
          {blocks.map((block, idx) => (
            <span
              className="border-border text-muted-foreground rounded-full border px-3 py-1 text-xs tracking-wide"
              key={`${block.label}-${idx}`}
            >
              {block.label}
            </span>
          ))}
        </div>
      )}
    </div>
  </section>
);
