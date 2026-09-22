# Shopify-style theme and template engine with relationship hierarchy

The storefront system is modeled after Shopify's architecture using a three-tier relationship hierarchy: `StoreSettings` (`isGlobal: true`) references an active `Theme`, which joins to its own set of `Page` documents containing `Section` blocks. Template packages are pure TypeScript packages with zero Payload dependencies; they export section definitions, settings schemas, page presets, React Server Components, and a `cssVars` function. A Payload plugin reads these definitions at boot time and converts them into native Payload field and block configurations.

## Status

Accepted

## Context and Decision

The previous design attempted to enforce a single platform-wide design token schema (`TemplateTokenSchema`) and dynamic plugin schema injection onto the core `Tenants` collection. This constrained themes to a fixed set of color slots, leaked Payload dependencies into template packages, and caused cross-template field collisions when switching designs.

We chose Shopify's isolated-instance model:
1. **`StoreSettings` (`isGlobal: true`)**: A per-tenant singleton collection for universal store identity (store name, public email, phone, logo, favicon, social links) and a relationship to the active `Theme`.
2. **`Themes` collection**: Represents installed theme instances. Stores global theme settings (colors, typography presets) and joins to its child `Page` documents.
3. **`Pages` collection**: Belongs to a specific theme (`theme: relationship to 'themes'`). Holds the page slug, template type (`home`, `product`, `standard-page`), and a `sections` blocks field.
4. **Namespaced section blocks**: The plugin namespaces section block slugs by template (`{templateSlug}_{sectionSlug}`) so templates can define distinct section settings without schema collisions.
5. **Decoupled template packages**: Templates are plain TypeScript packages with no Payload runtime dependencies. They declare setting fields using a lightweight TypeScript DSL (`text`, `textarea`, `richtext`, `number`, `toggle`, `select`, `color`, `upload`, `link`, `group`, `array`, `blocks`), React components, and a `cssVars` mapping function.
6. **Isolated theme switching**: Switching the active theme in `StoreSettings` points the storefront to a different theme instance without wiping or corrupting the previous theme's page layout and section data.

## Considered Options

- **Single shared token schema on Tenant (rejected)**: Inflexible. Forced every theme into identical styling constraints and cluttered the infrastructure `Tenants` table.
- **Section data mapping across themes (rejected)**: Translating arbitrary section fields between different theme layouts is fragile and loses styling intent.
- **Wiping section data on theme switch (rejected)**: Destroys merchant customization if they want to experiment with another theme and switch back.

## Consequences

- Creating a new theme instance requires seeding its default `Page` records and initial section blocks from the template manifest's presets.
- Storefront routes resolve pages by filtering on `theme == activeTheme` and the matching slug.
- Previews of draft themes run by passing a theme ID parameter supported by Payload's preview workflow.
