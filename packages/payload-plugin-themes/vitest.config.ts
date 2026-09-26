import path from "node:path";

import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    hookTimeout: 30_000,
    name: "payload-plugin-themes",
    testTimeout: 30_000,
  },
});
