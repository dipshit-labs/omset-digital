import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "payload-plugin-themes",
    projects: [
      {
        test: {
          environment: "node",
          include: ["src/**/*.test.ts"],
          name: "unit",
        },
      },
      {
        test: {
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          name: "ui",
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
