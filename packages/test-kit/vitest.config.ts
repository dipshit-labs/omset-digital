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
          environment: "node",
          include: ["src/**/*.test.ts"],
          name: "unit",
          setupFiles: ["@repo/test-kit/msw/setup"],
        },
      },
      {
        test: {
          environment: "node",
          fileParallelism: false,
          hookTimeout: 30_000,
          include: ["test/integrations/*.integration.test.ts"],
          name: "integration",
          testTimeout: 30_000,
        },
      },
    ],
  },
});
