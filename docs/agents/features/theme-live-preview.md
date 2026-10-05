# Theme live preview

Previewing theme token updates and template layout changes within Payload Admin.

## User flow

1. Log into Payload Admin at `/admin`.
2. Navigate to Themes collection (`/admin/collections/themes`) or Templates collection (`/admin/collections/templates`).
3. Open an active theme document and toggle the live preview pane.

## Driving with the browser tool

Open the theme document in a browser tab:

```javascript
const tab = await browser.open({
  name: "theme-preview",
  url: "http://localhost:3000/admin/collections/themes",
});
await tab.waitForSelector("main");
```

The preview pane embeds an iframe pointing to the storefront preview route (`/next/preview`).

To inspect the preview iframe:

```javascript
const previewFrame = tab.frame({ url: /next\/preview/ });
const heading = await previewFrame.text("h1");
```

## What proves it works

- The preview iframe loads the storefront layout rather than a Next.js 404 page.
- The client-side listener in `@repo/payload-plugin-themes/client` receives postMessage updates from Payload Admin.
- Theme tokens evaluate into CSS variables on the document element.
- `tab.errors()` and `previewFrame.errors()` report zero unhandled exceptions.

## Known pitfalls

- Iframe cross-origin restrictions. The preview URL must match the server origin or configure trusted origins.
- Next.js preview cookie. Navigating directly to preview URLs without visiting `/next/preview` bypasses draft mode.
