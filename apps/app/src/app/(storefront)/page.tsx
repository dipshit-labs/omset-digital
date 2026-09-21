import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center shadow-xl backdrop-blur-xs">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-400 text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Template Development Workbench
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-2xl text-white tracking-tight">
            Omset Digital Storefront
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Template developers can build, style, and hot-reload storefront
            components in isolation with zero database dependencies.
          </p>
        </div>

        <div className="pt-2">
          <Link
            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-sm text-zinc-950 shadow-sm transition-colors hover:bg-emerald-400"
            href="/preview"
          >
            Buka Template Workbench (/preview) &rarr;
          </Link>
        </div>

        <p className="text-xs text-zinc-500">
          Source: <code>packages/templates/default/src/sections/</code>
        </p>
      </div>
    </div>
  );
}
