import type {
  ProductGridSectionData,
  SectionProps,
} from "@repo/template-contract";
import type React from "react";

interface MockProduct {
  category: string;
  compareAtPrice?: string;
  id: string;
  name: string;
  price: string;
}

const SAMPLE_PRODUCTS: MockProduct[] = [
  {
    category: "Kopi",
    compareAtPrice: "Rp 110.000",
    id: "1",
    name: "Kopi Arabika Gayo Single Origin 250g",
    price: "Rp 95.000",
  },
  {
    category: "Kopi",
    id: "2",
    name: "Kopi Robusta Dampit Fine Robusta 250g",
    price: "Rp 65.000",
  },
  {
    category: "Kopi Praktis",
    id: "3",
    name: "Drip Bag Coffee Box (5 Sachet)",
    price: "Rp 50.000",
  },
  {
    category: "Alat Seduh",
    compareAtPrice: "Rp 175.000",
    id: "4",
    name: "Manual Brew V60 Glass Dripper 01",
    price: "Rp 145.000",
  },
];

export function ProductGridSection({
  data,
}: SectionProps<ProductGridSectionData>): React.ReactElement {
  const { showFeaturedOnly, title = "Produk Unggulan" } = data;
  const products = showFeaturedOnly
    ? SAMPLE_PRODUCTS.slice(0, 3)
    : SAMPLE_PRODUCTS;

  return (
    <section className="bg-background px-6 py-16 text-foreground sm:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-bold font-heading text-2xl tracking-tight sm:text-3xl">
              {title}
            </h2>
            <p className="mt-1 font-body text-muted-foreground text-sm">
              Pilihan terbaik dari koleksi kami
            </p>
          </div>
          <a
            className="inline-flex items-center font-medium text-primary text-sm hover:underline"
            href="#koleksi"
          >
            Lihat Semua Produk &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <div
              className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card p-4 text-card-foreground transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              key={product.id}
            >
              <div className="mb-4 flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
                [Foto Produk]
              </div>
              <div className="flex-1 space-y-2">
                <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {product.category}
                </span>
                <h3 className="line-clamp-2 font-semibold text-card-foreground text-sm leading-snug">
                  {product.name}
                </h3>
              </div>
              <div className="mt-4 flex items-baseline justify-between border-border border-t pt-2">
                <span className="font-bold text-base text-primary">
                  {product.price}
                </span>
                {product.compareAtPrice ? (
                  <span className="text-muted-foreground text-xs line-through">
                    {product.compareAtPrice}
                  </span>
                ) : null}
              </div>
              <button
                className="mt-3 w-full rounded-md bg-primary py-2 font-semibold text-primary-foreground text-xs transition-opacity hover:opacity-90"
                type="button"
              >
                Beli Sekarang
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
