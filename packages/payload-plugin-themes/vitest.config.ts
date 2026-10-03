import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    hookTimeout: 30_000,
    name: "payload-plugin-themes",
    testTimeout: 30_000,
  },
});
