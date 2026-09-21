import type { HeroSectionData, SectionProps } from "@repo/template-contract";
import type React from "react";

export function HeroSection({
  data,
}: SectionProps<HeroSectionData>): React.ReactElement {
  const { ctaText, ctaUrl, headline, subheadline } = data;

  return (
    <section className="relative overflow-hidden border-border border-b bg-background px-6 py-20 text-foreground sm:px-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center space-y-6 text-center">
        <h1 className="font-bold font-heading text-4xl text-foreground tracking-tight sm:text-6xl">
          {headline}
        </h1>
        {subheadline ? (
          <p className="max-w-2xl font-body text-lg text-muted-foreground sm:text-xl">
            {subheadline}
          </p>
        ) : null}
        {ctaText ? (
          <div className="pt-4">
            <a
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 font-semibold text-base text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
              href={ctaUrl ?? "#produk"}
            >
              {ctaText}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
