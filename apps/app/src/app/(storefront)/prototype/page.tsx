import type { CSSProperties } from "react";
import { defaultTemplateManifest } from "@/payload/prototype/sample-template";

export const dynamic = "force-dynamic";

/**
 * PROTOTYPE: Storefront Render Loop from 3-Tier Hierarchy
 *
 * Question: Does the 3-tier hierarchy (`StoreSettings` -> `Themes` -> `Pages`)
 * and DSL-driven section blocks cleanly power both Payload Admin and Storefront rendering?
 */
export default async function PrototypeStorefrontPage() {
  // Mock tenant data representing the exact shape returned by Payload Local API:
  const mockStoreSettings = {
    publicEmail: "hello@nusantara-artisan.id",
    publicPhone: "+62 812-3456-7890",
    storeName: "Nusantara Artisan Store",
    tagline: "Handcrafted ceramics and textiles from Yogyakarta",
    activeTheme: {
      id: 1,
      name: "Modern Clean (Live)",
      templateSlug: "default",
      settings: {
        backgroundColor: "#f8fafc",
        containerMaxWidth: "1280",
        headingFont: "Plus Jakarta Sans",
        primaryColor: "#0f172a",
        secondaryColor: "#0284c7",
      },
    },
  };

  const mockHomePage = {
    slug: "home",
    templateType: "home",
    title: "Home",
    sections: [
      {
        badgeText: "Spring Collection 2026 Live",
        blockType: "default_hero",
        heading: "Handcrafted Indonesian Heritage for Modern Homes",
        showBadge: true,
        subheading:
          "Direct from master artisans in Kasongan, Yogyakarta to your doorstep. Verified authentic, fairly traded.",
        variant: "split",
        blocks: [
          {
            blockType: "default_hero_feature_bullet",
            description:
              "Double-walled wooden crates for zero transit breakages.",
            title: "Safe Courier Packing",
          },
          {
            blockType: "default_hero_feature_bullet",
            description:
              "Direct instant bank settlement with zero intermediary fees.",
            title: "BYOK Xendit & QRIS",
          },
        ],
        primaryCta: {
          label: "Shop Ceramic Wares",
          openInNewTab: false,
          url: "/collections/ceramics",
        },
      },
      {
        blockType: "default_featured_products",
        columns: "3",
        heading: "Curated Masterpieces",
        limit: 3,
        showAddToCart: true,
      },
    ],
  };

  // Convert theme settings to CSS custom properties via the manifest's cssVars function:
  const cssVars = defaultTemplateManifest.cssVars
    ? defaultTemplateManifest.cssVars(mockStoreSettings.activeTheme.settings)
    : {};

  return (
    <div
      className="min-h-screen bg-[var(--color-bg,#ffffff)] font-sans text-zinc-900"
      style={cssVars as CSSProperties}
    >
      {/* Prototype Banner */}
      <div className="flex items-center justify-between border-amber-600 border-b bg-amber-500 px-4 py-2 font-mono font-semibold text-amber-950 text-xs">
        <span>
          [PROTOTYPE] Route: /prototype | Theme:{" "}
          {mockStoreSettings.activeTheme.name} (
          {mockStoreSettings.activeTheme.templateSlug})
        </span>
        <span>Three-Tier Relationship: StoreSettings → Themes → Pages</span>
      </div>

      {/* Header (Powered by StoreSettings) */}
      <header className="sticky top-0 z-50 border-zinc-200 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[var(--max-width,1280px)] items-center justify-between px-6">
          <div>
            <span className="font-bold text-[var(--color-primary,#0f172a)] text-lg tracking-tight">
              {mockStoreSettings.storeName}
            </span>
            <p className="hidden text-xs text-zinc-500 sm:block">
              {mockStoreSettings.tagline}
            </p>
          </div>
          <nav className="flex items-center gap-6 font-medium text-sm text-zinc-600">
            <span className="font-semibold text-[var(--color-secondary,#0284c7)]">
              Home
            </span>
            <span>Catalog</span>
            <span>About</span>
            <span>Contact</span>
          </nav>
        </div>
      </header>

      {/* Main Content (Rendered from Pages.sections blocks) */}
      <main className="mx-auto max-w-[var(--max-width,1280px)] space-y-16 px-6 py-12">
        {mockHomePage.sections.map((section) => {
          if (section.blockType === "default_hero") {
            return (
              <section
                className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12"
                key={`section-${section.blockType}`}
              >
                <div className="max-w-2xl space-y-6">
                  {section.showBadge ? (
                    <span className="inline-block rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800 text-xs">
                      {section.badgeText}
                    </span>
                  ) : null}
                  <h1 className="font-extrabold text-4xl text-[var(--color-primary,#0f172a)] leading-tight tracking-tight sm:text-5xl">
                    {section.heading}
                  </h1>
                  <p className="text-lg text-zinc-600 leading-relaxed">
                    {section.subheading}
                  </p>
                  {section.primaryCta ? (
                    <div>
                      <a
                        className="inline-flex items-center justify-center rounded-lg bg-[var(--color-primary,#0f172a)] px-6 py-3 font-semibold text-sm text-white transition-opacity hover:opacity-90"
                        href={section.primaryCta?.url}
                      >
                        {section.primaryCta?.label}
                      </a>
                    </div>
                  ) : null}
                  {/* Section child blocks */}
                  {section.blocks && section.blocks.length > 0 ? (
                    <div className="grid gap-4 border-zinc-100 border-t pt-6 sm:grid-cols-2">
                      {section.blocks?.map((block) => (
                        <div
                          className="rounded-lg border border-zinc-200/60 bg-zinc-50 p-4"
                          key={`block-${block.title}`}
                        >
                          <h4 className="font-bold text-sm text-zinc-900">
                            {block.title}
                          </h4>
                          <p className="mt-1 text-xs text-zinc-500">
                            {block.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          }

          if (section.blockType === "default_featured_products") {
            return (
              <section
                className="space-y-6"
                key={`section-${section.blockType}`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-2xl text-[var(--color-primary,#0f172a)] tracking-tight">
                    {section.heading}
                  </h2>
                  <span className="font-mono text-xs text-zinc-400">
                    Layout: {section.columns} Columns | Limit: {section.limit}{" "}
                    items
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      className="group overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                      key={`product-card-${item}`}
                    >
                      <div className="flex aspect-square items-center justify-center bg-zinc-100 text-sm text-zinc-400">
                        Product Photo {item}
                      </div>
                      <div className="space-y-2 p-4">
                        <h3 className="font-semibold text-sm text-zinc-900">
                          Terracotta Vase #{item}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Hand-thrown earthenware clay
                        </p>
                        <div className="flex items-center justify-between pt-2">
                          <span className="font-bold text-sm text-zinc-900">
                            Rp {(150_000 * item).toLocaleString("id-ID")}
                          </span>
                          {section.showAddToCart ? (
                            <button
                              className="rounded bg-zinc-100 px-3 py-1.5 font-semibold text-xs text-zinc-800 transition-colors hover:bg-zinc-200"
                              type="button"
                            >
                              + Add
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
      </main>

      {/* Surface the Raw State (Per Prototype Skill Rules) */}
      <footer className="mt-16 border-zinc-300 border-t bg-zinc-900 px-6 py-8 font-mono text-xs text-zinc-300">
        <div className="mx-auto max-w-[var(--max-width,1280px)] space-y-4">
          <p className="font-bold text-zinc-100">
            [PROTOTYPE STATE INSPECTION]
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-zinc-400">
                Injected CSS Variables from Theme Settings:
              </p>
              <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-emerald-400">
                {JSON.stringify(cssVars, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 text-zinc-400">Page Document Sections Tree:</p>
              <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-sky-400">
                {JSON.stringify(mockHomePage.sections, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
