/**
 * Detects whether the current runtime environment is inside Next.js.
 * In test environments (Vitest/Jest) or non-Next.js runtimes, returns false
 * so headless primitives fall back to standard HTML elements.
 */
export const isNextJsEnvironment = (): boolean => {
  if (typeof process !== "undefined") {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return false;
    }

    if (process.env.NEXT_RUNTIME || process.env.__NEXT_PROCESSED_ENV) {
      return true;
    }
  }

  if (
    typeof window !== "undefined" &&
    (Reflect.has(window, "__NEXT_DATA__") ||
      Reflect.has(window, "__next_f") ||
      Reflect.has(window, "next"))
  ) {
    return true;
  }

  return false;
};
