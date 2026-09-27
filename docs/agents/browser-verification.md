# Browser verification

Drive the web application in a browser tab to verify user-facing UI changes, live preview synchronization, and client-side hydration.

## When to verify in a browser

Automated unit and integration test suites run in Vitest without booting a headless browser. Use browser verification for:

- Storefront section rendering and responsive layouts.
- CSS variable token binding and theme switching.
- Payload Admin live preview synchronization across iframes.
- Reproducing client hydration errors and DOM errors that unit tests miss.

Detailed routes and interaction patterns live in `docs/agents/features/`.

## Running the dev server

Start the dev server as a persistent service using the `bash` tool:

```json
{
  "name": "dev-server",
  "command": "bun run dev",
  "ready": { "port": 3000, "timeout": 60 }
}
```

If the server fails to answer, inspect `.data/logs/dev-latest.log` to read compiler and startup errors.

## Driving tabs with the browser tool

Run browser commands inside an `eval` call using the global `browser` object.

### 1. Open and navigate

```javascript
const tab = await browser.open({
  name: "storefront-verify",
  url: "http://localhost:3000",
});
```

### 2. Observe structure and interact

Inspect accessible elements, click roles, or fill form fields:

```javascript
const obs = await tab.observe();
const snapshot = await tab.ariaSnapshot();

// Click button by accessible name or selector
await tab.click("button");
```

### 3. Catch hydration and console errors

Always inspect errors and logs after loading a page:

```javascript
const errors = await tab.errors();
const consoleLogs = await tab.console();
```

Any unhandled client exception or hydration mismatch indicates a failed check.

### 4. Capture visual evidence

Save screenshots when reporting visual verification:

```javascript
await tab.screenshot({ path: "local://storefront-home.png" });
```

### 5. Cleanup

Always close open tabs before completing the turn:

```javascript
await tab.close({ name: "storefront-verify" });
```

## Stopping the dev server

Stop the background service when verification finishes:

```
write proc://dev-server/kill
```
