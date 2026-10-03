import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    name: "commerce-adapters",
    setupFiles: ["@repo/test-kit/msw/setup"],
  },
});
