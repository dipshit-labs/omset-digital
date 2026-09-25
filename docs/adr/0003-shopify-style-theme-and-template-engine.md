# Shopify-style theme and template engine with relationship hierarchy

The storefront system is modeled after Shopify's architecture using a tiered relationship hierarchy: `StoreSettings` (`isGlobal: true`) references an active `Theme`, which joins to its `Template` documents (`home`, `product`, `collection`, `page`) containing `Section` blocks, while `Pages` reference a layout `Template`. Theme packages are pure TypeScript packages with zero Payload dependencies; they export section definitions, settings schemas, page presets, React components, and a `cssVars` function. A dedicated Payload plugin (`@repo/payload-plugin-themes`) provides the collections, DSL contracts, field helpers, live preview subscriber, and boot-time auto-sync.

## Status

Accepted

## Context and decision

The previous design attempted to enforce a single platform-wide design token schema (`TemplateTokenSchema`) and dynamic plugin schema injection onto the core `Tenants` collection. This constrained themes to a fixed set of color slots, leaked Payload dependencies into theme packages, and caused cross-template field collisions when switching designs.

We chose Shopify's isolated-instance model with a plugin-driven engine:
1. **`StoreSettings` (`isGlobal: true`)**: A per-tenant singleton collection for universal store identity (store name, public email, phone, logo, favicon, social links) and a relationship to the active `Theme`.
2. **`Themes` collection**: Injected by the plugin. Represents installed theme instances, stores global theme settings (colors, typography presets), and joins to child `Template` documents.
3. **`Templates` collection**: Injected by the plugin. Belongs to a specific theme (`theme: relationship to 'themes'`). Holds the template type (`home`, `product`, `collection`, `page`) and an ordered `sections` blocks field.
4. **`Pages` collection**: Retained by the application for merchant-created content (e.g. About, Contact). Uses the plugin's `themeTemplateField` to reference a layout `Template`.
5. **Namespaced section blocks**: The plugin namespaces section block slugs by theme (`{themeSlug}_{sectionSlug}`) so themes can define distinct section settings without schema collisions.
6. **Decoupled theme packages**: Theme packages are plain TypeScript packages with no Payload runtime dependencies. They import DSL definitions from `@repo/payload-plugin-themes/types` (`text`, `textarea`, `richText`, `number`, `toggle`, `select`, `color`, `upload`, `link`, `group`, `array`, `blocks`), React components, and a `cssVars` mapping function.
7. **Plugin subpath structure (`@repo/payload-plugin-themes`)**:
   - `.`: Server-side Payload plugin injecting `themes` and `templates` collections, and auto-syncing manifests on boot.
   - `./types`: Pure TypeScript DSL definitions with zero Payload dependencies.
   - `./client`: Client-side live preview subscriber and styling wrapper for Next.js preview routes.
   - `./fields`: Field helpers (`themeTemplateField`) and block converters.
8. **Dual-execution live preview**: The storefront preview route (`/preview`) mounts a client subscriber that receives Payload Admin live preview events via `postMessage`. In production, the exact same section components render as React Server Components with no client preview overhead.
9. **Boot-time auto-sync**: On server startup, the plugin synchronizes registered theme manifests and default presets to existing stores in the database, creating a default store if the database has none.
## Considered options

- **Single shared token schema on Tenant (rejected)**: Inflexible. Forced every theme into identical styling constraints and cluttered the infrastructure `Tenants` table.
- **Section data mapping across themes (rejected)**: Translating arbitrary section fields between different theme layouts is fragile and loses styling intent.
- **Wiping section data on theme switch (rejected)**: Destroys merchant customization if they want to experiment with another theme and switch back.
- **Standalone theme devtools without Payload (rejected)**: Reinvented form controls and preview chrome that Payload's native `livePreview` already provides, while disconnecting theme development from real store data.
- **Monolithic plugin export (rejected)**: Leaks server-side Payload dependencies and Node globals into storefront client components.
## Consequences

- Theme packages depend strictly on `@repo/payload-plugin-themes/types` and remain isolated from Payload internals.
- Creating or auto-syncing a theme seeds default `Template` records and section blocks from the theme manifest presets.
- Storefront routes resolve the active theme and render corresponding templates.
- Live preview runs in Next.js using Payload Admin's native responsive iframe toolbar.
