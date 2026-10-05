import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "test-kit",
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          setupFiles: ["@repo/test-kit/msw/setup"],
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          fileParallelism: false,
          hookTimeout: 30_000,
          include: ["test/integrations/*.integration.test.ts"],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
