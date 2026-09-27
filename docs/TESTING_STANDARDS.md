# Testing standards

The worked examples behind the testing rules in `CODING_STANDARDS.md`. Read those two core rules first: verify behavior through public interfaces, and mock at system boundaries only. Everything here shows how they look in practice.

## Good tests

Integration tests exercise real code paths through public APIs. They describe what the system does, not how.

```typescript
// Good: Tests observable behavior through the public function
it("syncThemes creates default templates for store without existing theme", async () => {
  const fakePayload = createMockPayload();
  const manifest = defaultTheme;

  await syncThemes(fakePayload, manifest);

  const templates = await fakePayload.find({ collection: "templates" });
  expect(templates.docs).toHaveLength(1);
  expect(templates.docs[0].slug).toBe("home");
});
```

- Test behavior that callers and merchants care about.
- Use exported functions and public APIs only.
- Survive internal refactors.
- Include one logical assertion per test.

## Bad tests

```typescript
// Bad: Mocks an internal collaborator, testing implementation rather than behavior
it("calls internal sync utility during theme registration", async () => {
  const spy = vi.spyOn(syncModule, "syncThemeForStore");
  await syncThemes(payload, manifest);
  expect(spy).toHaveBeenCalledOnce();
});

// Bad: Bypasses the public interface to query the database directly
it("registers store successfully", async () => {
  await createStore({ name: "Toko Kopi" });
  const rawRow = await postgresClient.query("SELECT * FROM stores WHERE name = $1", ["Toko Kopi"]);
  expect(rawRow.rows).toHaveLength(1);
});

// Bad: Test restates the implementation without adding confidence
it("returns slug with prefix", () => {
  expect(formatSlug("toko-baru")).toBe("store-toko-baru");
});
```

Red flags:

- Mocking internal collaborators or your own utility functions with `vi.mock`.
- Testing unexported private helper functions.
- Asserting on internal call counts or the sequence of internal steps.
- Tests breaking after a refactor when observable behavior did not change.
- Test names describing how the code works instead of what outcome occurs.
- Verifying state through direct database queries when the public API provides the query.
- Testing trivial one-line mappings or string concatenations where the test mirrors the source code.
- Thin delegation tests for route handlers where the test only verifies that an action called a service. Test the service logic directly instead.

## Mocking at a boundary

Mock at system boundaries only: external network APIs, system time, randomness, and storage when a live instance is impractical. Everything inside the boundary must run real.

- **Prefer SDK-style interfaces over generic fetchers.** Wrap external payment or shipping gateways behind clear typed interfaces like `PaymentProvider` or `ShippingProvider`. Each method returns a predictable shape without conditional setup logic in tests.
- **Use in-memory duck-typed fakes for Payload operations.** When testing plugins or lifecycle routines, pass a lightweight fake satisfying the required interface, such as `ThemeSyncPayload`, rather than monkey-patching Payload with `vi.mock`.
- **Never mock internal collaborators.** If a function is hard to test without mocking another local file in the same repository, redesign the interface to pass dependencies in or split the logic into pure functions.

## Storefront themes and UI components

Never boot a full headless browser in unit and integration test suites. Headless browsers require extra setup, run slowly, and assert on styling details that intentional visual changes alter.

- **Test props schemas and settings bindings.** Validate that section schemas, template definitions, and declarative `cssVar` bindings produce valid contracts when evaluated with `evaluateThemeCssVars`. These are pure data transformations and run instantly.
- **Test component interactivity in jsdom.** Render interactive client components with `@testing-library/react` and assert on accessible roles or user interactions.
- **Verify user flows with the browser tool.** Visual appearance, responsive layouts, and live preview belong in interactive browser verification runs rather than automated pixel test assertions. See `docs/agents/browser-verification.md`.

## Vertical slice test-driven development

Write one test, make it pass, then write the next. Writing an entire test suite before writing implementation code produces tests that assert on imagined details and resist natural design improvements.

1. Write a failing test for a single observable behavior.
2. Write the minimum code required to turn the test green.
3. Refactor while keeping all tests green.

Each test builds on what the previous cycle proved. Always reach a passing test before refactoring.
