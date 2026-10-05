import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "payload-plugin-commerce",
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "ui",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
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
