declare global {
  var BASE_UI_ANIMATIONS_DISABLED: boolean | undefined;
}

// Base UI checks BASE_UI_ANIMATIONS_DISABLED on globalThis to skip animation waits in tests.
globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
