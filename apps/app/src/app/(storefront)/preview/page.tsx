import { filterAndSortSections } from "@repo/template-contract";
import { template } from "@repo/template-default";
import type React from "react";
import { MOCK_SECTIONS, MOCK_TENANT } from "@/lib/workbench";

export default function WorkbenchPreviewPage(): React.ReactElement {
  const cssVars = template.tokensToCssVars(MOCK_TENANT.templateTokens);
  const orderedSections = filterAndSortSections(MOCK_SECTIONS);

  return (
    <div
      className="flex min-h-screen flex-col bg-background font-body text-foreground"
      style={cssVars as React.CSSProperties}
    >
      {/* Workbench Dev Toolbar */}
      <aside
        aria-label="Template workbench bar"
        className="sticky top-0 z-50 border-zinc-800 border-b bg-zinc-900 px-4 py-2.5 text-zinc-100 shadow-md"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-bold text-[11px] text-zinc-300 uppercase tracking-wide">
              Template Workbench
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">
              Template:{" "}
              <strong className="font-medium text-white">
                {template.manifest.label} ({template.manifest.slug})
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span>Primary:</span>
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-zinc-700"
                style={{
                  backgroundColor: MOCK_TENANT.templateTokens.primary,
                }}
                title={MOCK_TENANT.templateTokens.primary}
              />
              <code className="text-[11px] text-zinc-300">
                {MOCK_TENANT.templateTokens.primary}
              </code>
            </div>
            <span>•</span>
            <div>
              <span>Radius: </span>
              <code className="text-[11px] text-zinc-300">
                {MOCK_TENANT.templateTokens.borderRadius}
              </code>
            </div>
            <span>•</span>
            <span className="hidden rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 sm:inline">
              Zero DB / Mock Mode
            </span>
          </div>
        </div>
      </aside>

      {/* Main Storefront Section Render Loop */}
      <main className="flex-1">
        {orderedSections.map((section) => {
          const Component = template.registry[section.type];

          if (!Component) {
            return (
              <div
                className="mx-auto my-4 max-w-4xl rounded-(--radius) border-2 border-amber-300 border-dashed bg-amber-50 p-8 text-center text-amber-900"
                key={section.id ?? section.type}
              >
                <p className="font-semibold">
                  Section type "{section.type}" tidak terdaftar di template ini.
                </p>
                <p className="mt-1 text-amber-700 text-xs">
                  Tambahkan renderer di{" "}
                  <code>packages/templates/default/src/sections/</code> untuk
                  menampilkannya.
                </p>
              </div>
            );
          }

          return (
            <div id={section.id} key={section.id ?? section.type}>
              <Component
                data={section.data}
                id={section.id}
                tokens={MOCK_TENANT.templateTokens}
              />
            </div>
          );
        })}
      </main>

      {/* Storefront Footer */}
      <footer className="border-zinc-800 border-t bg-zinc-950 px-6 py-12 text-sm text-zinc-400">
        <div className="mx-auto flex max-w-(--container-width) flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© 2026 {MOCK_TENANT.name}. Powered by Omset Digital.</p>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span>Template Developer Preview</span>
            <span>•</span>
            <a
              className="hover:underline"
              href="https://github.com/dipshit-labs/omset-digital"
              rel="noreferrer"
              target="_blank"
            >
              Docs &amp; Source
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
