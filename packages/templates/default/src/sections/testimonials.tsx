import type {
  SectionProps,
  TestimonialsSectionData,
} from "@repo/template-contract";
import type React from "react";

export function TestimonialsSection({
  data,
}: SectionProps<TestimonialsSectionData>): React.ReactElement {
  const { items } = data;

  return (
    <section className="bg-background px-6 py-16 text-foreground sm:px-12">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="space-y-3 text-center">
          <span className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
            Ulasan Pelanggan
          </span>
          <h2 className="font-bold font-heading text-3xl tracking-tight">
            Apa Kata Mereka?
          </h2>
          <p className="font-body text-muted-foreground text-sm">
            Pengalaman nyata dari pelanggan setia kami
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item) => (
            <div
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xs"
              key={item.name}
            >
              <div className="space-y-4">
                <div className="flex text-amber-400 text-sm tracking-tighter">
                  ★★★★★
                </div>
                <p className="font-body text-card-foreground text-sm italic leading-relaxed">
                  "{item.quote}"
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 border-border border-t pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground text-xs">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-card-foreground text-xs">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Verified Buyer
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
