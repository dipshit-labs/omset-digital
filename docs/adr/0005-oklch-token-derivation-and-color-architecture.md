# OKLCH theme token derivation and color architecture

We adopted Culori (`culori/fn`) to implement an automated color derivation engine in `@repo/theme-core`. The engine derives accessible brand ramps, a 4-layer background hierarchy, a 2-layer stroke system, a 3-variant text hierarchy, and a 3-slot semantic feedback contract from a single merchant brand input, while permitting explicit merchant overrides. Store mode (light or dark) is determined per-store at request time rather than dynamic buyer OS switching.

## Status

Accepted (extends ADR-0004)

## Context and decision

In ADR-0004, theme tokens were flat static strings (`--theme-background`, `--theme-surface`, `--theme-brand`). When merchants selected custom colors in Payload CMS, three problems emerged:
1. **Accessibility failures:** Selecting light brand colors like yellow or mint on buttons left button text white, violating WCAG 2.1 AA.
2. **Missing hierarchy:** Product cards lacked distinction from the canvas background because both used white. Primitive components like `CartSheet` and `Dialog` lacked elevated surface tokens, while `VariantSelector` lacked strong stroke tokens.
3. **Semantic styling hacks:** Feedback states only had solid backgrounds with white text. Storefront alerts and status badges resorted to arbitrary Tailwind opacity classes (`bg-emerald-500/10`), which washed out or clashed in dark themes.

We adopted the following architecture across `@repo/theme-core`:

1. **Mathematical engine (`culori/fn`):**
   We use `culori/fn` with `useMode(modeOklch, modeP3, modeRgb)`. Bundle footprint is 8.6 KB gzipped with zero runtime dependencies. Evaluation takes ~11 microseconds per request, running synchronously in Node.js and React Server Components without browser globals.

2. **Neutral foundation (4 backgrounds, 2 strokes, 3 text variants):**
   - **Backgrounds:** `--theme-background` (base canvas), `--theme-background-subtle` (table rows, secondary bands), `--theme-surface` (cards), and `--theme-surface-elevated` (modals, dropdowns, cart sheets). In light mode, base canvas is an off-white tint (`oklch(0.985 0.005 h)`), making white (`#ffffff`) cards pop without heavy drop shadows.
   - **Strokes:** `--theme-border` (subtle card strokes at ~10% opacity) and `--theme-border-strong` (focus rings, selected variant pills).
   - **Text:** `--theme-foreground` (headings, high contrast), `--theme-foreground-body` (body copy), and `--theme-muted-foreground` (metadata, captions).

3. **Constrained neutral tinting:**
   Neutrals shift hue toward the merchant brand color, but chroma is capped at `0.005` for canvas and borders. Card surfaces remain pure white (`#ffffff`) in light mode to preserve product photography white balance.

4. **Merchant-chosen store mode (Light vs. Dark):**
   Store mode is configured per-store or by theme preset. We do not use automatic buyer `prefers-color-scheme` switching, ensuring the merchant's photography and brand aesthetics remain consistent across all buyer devices. When dark mode is active, the engine enforces strict physical elevation (surfaces get progressively lighter by 4% to 6% per layer) and shifts primary brand lightness to 300–400 (`L ~ 0.70 to 0.76`) to avoid chromatic aberration on dark backgrounds.

5. **Layered defaults with merchant overrides:**
   The engine derives all tokens from a single merchant brand color by default at SSR request time inside `evaluateThemeCssVars`. Evaluation takes ~11 microseconds, leaving server response times unaffected and eliminating the need for database schema migrations. In Payload CMS Admin, settings display a prominent Brand Color picker and Store Mode toggle, while advanced overrides (canvas, card surface, custom borders) live in a collapsible settings group. If a manual override fails WCAG 2.1 AA (< 4.5:1), the admin UI displays a warning but respects the merchant's explicit choice.

6. **Direct layered Tailwind v4 semantics:**
   Tailwind v4 classes in `packages/theme-core/src/styles/theme.css` use direct physical elevation names rather than UI component names:
   - Backgrounds: `bg-background`, `bg-background-subtle`, `bg-surface`, `bg-surface-elevated`.
   - Strokes: `border-border`, `border-border-strong`.
   - Text hierarchy: `text-foreground` (headings), `text-foreground-body` (body copy), `text-muted-foreground` (captions, metadata).

7. **Three-slot semantic feedback contract:**
   Fixed tokens (`error`, `success`, `warning`, `info`) each supply three explicit slots: solid (`--theme-[name]`), tinted background (`--theme-[name]-subtle`), and high-contrast text (`--theme-[name]-foreground`).

8. **Native CSS Color 4 OKLCH emission:**
   `evaluateThemeCssVars` emits CSS custom property values as native `oklch(L C H)` strings. This allows Tailwind CSS v4 to apply arbitrary alpha opacity modifiers (such as `bg-brand/10` or `border-border/50`) without color breakdown shims.

9. **Theme manifest consolidation in `index.ts`:**
   Theme packages eliminate intermediate `branding.ts` and `manifest.ts` files. A theme package exposes its entire declaration directly in `src/index.ts` via `defineTheme({ branding: { ... }, customSettings: [ ... ], sections, templates })`. Everything outside `index.ts` is private implementation inside `sections/` and `templates/`.

## Consequences

- Storefront sections can rely on semantic classes like `bg-surface-elevated`, `border-border-strong`, `bg-error-subtle`, and `text-error-foreground` without custom opacity utilities.
- Merchants get an accessible, harmonious storefront by picking a single hex code.
- Primary buttons automatically guarantee WCAG 2.1 AA contrast by auto-selecting `#ffffff` or `#0f172a` for `--theme-brand-foreground`.
- Theme authors write declarative, typesafe theme manifests in a single file (`index.ts`) with zero CSS variable wiring boilerplate.
