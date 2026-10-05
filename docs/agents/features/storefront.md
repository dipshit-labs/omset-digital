# Storefront rendering

Public buyer-facing storefront pages rendered via React Server Components.

## User flow

1. Open root buyer route at `/`.
2. Browse storefront layout and section components.

## Driving with the browser tool

Open the storefront home page:

```javascript
const tab = await browser.open({
  name: "storefront-home",
  url: "http://localhost:3000",
});
await tab.waitForSelector("main");
```

Inspect accessible hierarchy and layout structure:

```javascript
const snapshot = await tab.ariaSnapshot();
const errors = await tab.errors();
```

## What proves it works

- Root page responds with HTTP 200.
- Storefront sections render without throwing hydration mismatches.
- Sections load as server components without leaking unnecessary client JavaScript.
- Theme tokens generate CSS variables on `:root` corresponding to the active store theme.

## Known pitfalls

- Missing tenant store. If the database has no stores seeded, the storefront returns a store resolution error. Run `bun run dev` with `PAYLOAD_SEED=true` on first setup.
- Tenant isolation. Storefront data loaders must scope queries through `resolveTenantStoreSlug`.
