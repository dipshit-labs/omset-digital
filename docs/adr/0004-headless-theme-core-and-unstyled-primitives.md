# Headless theme core and unstyled primitives

We extracted the theme engine, token contract, and section renderer out of `@repo/payload-plugin-themes` and `@repo/ui` into a unified package (`@repo/theme-core`), and replaced shadcn components in theme packages with unstyled Base UI primitives. Theme CSS custom properties use an isolated `--theme-*` prefix, keeping `@repo/ui` strictly dedicated to Omset Digital marketing and admin pages. `packages/payload-plugin-themes` becomes an application-agnostic bridge that maps theme schemas to Payload collections without managing tenant stores.

## Status

Accepted (supersedes styling and dependency boundaries in ADR-0003)

## Context and decision

The previous architecture coupled theme packages to `@repo/ui` for tokens and CSS variables, while `@repo/payload-plugin-themes` bundled headless DSL contracts together with Payload-specific database hooks and tenant store seeding. This caused three architectural problems:

1. Theme styling bled into platform brand styling, creating collision risks between storefronts and marketing pages.
2. Theme components relied on opinionated shadcn styles instead of giving theme authors full control over their visual markup.
3. Theme packages and tests depended on Payload runtime libraries, while the Payload plugin carried hardcoded assumptions about multi-tenant store records.

We restructured the system into two distinct layers:

1. **Unified Theme Engine (`@repo/theme-core`)**: A single package with explicit subpath exports:
   - `@repo/theme-core`: Pure TypeScript DSL (`defineTheme`, `defineSection`), schema types, client manifest mappers, token definitions, and token evaluation (`evaluateThemeCssVars`). Zero React and zero DOM dependencies.
   - `@repo/theme-core/primitives`: Unstyled Base UI layout primitives (`Button`, `Dialog`, `Sheet`, `Accordion`, `Input`) using a shadcn-compatible API, accessible e-commerce primitives (`ProductPrice`, `QuantityInput`, `VariantSelector`, `CartSheet`), and environment-aware `<Link>` and `<Image>` adapters that use Next.js in production and standard HTML fallbacks during testing. Primitives enforce structural and behavioral styling (spatial positioning, viewport bounds, transitions, keyboard navigation, focus rings) with zero cosmetic styling (no background or border colors, surface padding left to themes). Multi-node domain primitives support slot styling through a `classNames` dictionary and stable `data-slot` selectors.
   - `@repo/theme-core/utils`: Class name merger (`cn`) and template section renderer (`renderThemeSections`).
   - `@repo/theme-core/styles`: Tailored Tailwind v4 stylesheet (`theme.css`) binding `--theme-*` variables to standard Tailwind utility classes via `@theme inline`.

2. **Tiered Theme Token Contract**:
   - **Merchant Controlled Tokens**:
     - Backgrounds: `--theme-background` (page background), `--theme-surface` (cards, panels), `--theme-muted` (subtle backgrounds, badges, inputs).
     - Text: `--theme-foreground` (body text), `--theme-muted-foreground` (subtext, captions).
     - Border: `--theme-border` (default stroke).
     - Brand: `--theme-brand` (main brand color), `--theme-brand-foreground` (text on brand background).
     - Shape: `--theme-radius` (base border radius).
     - Typography: `--theme-font-heading`, `--theme-font-body`.
   - **Fixed Tokens**:
     - Semantic feedback: `--theme-success`, `--theme-success-foreground`, `--theme-error`, `--theme-error-foreground`, `--theme-warning`, `--theme-warning-foreground`.
     - Derived shapes: `--theme-radius-sm`, `--theme-radius-md`, `--theme-radius-lg`, `--theme-radius-full` calculated from `--theme-radius`.

3. **Decoupled Payload Plugin (`packages/payload-plugin-themes`)**: Reduced to a thin bridge registering `themes` and `templates` collections, converting theme settings into Payload fields (`buildThemeSettingsFields`), providing the template picker field (`themeTemplateField`), and subscribing to admin live preview events. Hardcoded store bootstrapping and `ensureDefaultStore` are deleted.
4. **Isolated Brand Package (`@repo/ui`)**: Stripped of theme-facing tokens. Exclusively dedicated to Omset Digital marketing pages and admin interfaces.

## Considered options

- **Separate packages for engine and primitives (rejected)**: Created excessive package boundary ceremony for tightly coupled theme development without providing tangible leverage.
- **Naked HTML primitives without structural layout (rejected)**: Forced theme authors to re-implement modal positioning, portal management, and slide-out sheet coordinates from scratch.
- **Cosmetic styling in primitives (rejected)**: Hardcoding surface backgrounds, borders, or shadows into primitives forces theme authors to write negative overrides. Primitives restrict defaults to structural geometry, motion curves, and interaction states.
- **Direct Next.js imports in theme packages (rejected)**: Locked theme packages to Next.js runtimes and required heavy mocking in Vitest suites.
- **Global store bootstrapping inside Payload plugin (rejected)**: Violated single-responsibility boundaries by making a theme plugin assume store collection ownership.

## Consequences

- Theme packages (`packages/themes/*`) depend solely on `@repo/theme-core: workspace:*`.
- Storefront routes in `apps/app` import `@repo/theme-core/styles` instead of `@repo/ui/shared.css`.
- Theme authors write standard Tailwind classes (`bg-primary`, `font-heading`) while runtime CSS variables evaluate strictly under `--theme-*`.
- Vitest suites for themes run fast and in isolation without Next.js or Payload runtime mocks.
- Primitives provide responsive viewport bounds and entry/exit motion out of the box, while themes supply palettes, borders, and surface padding.
