import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "commerce-adapters",
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          setupFiles: ["@repo/test-kit/msw/setup"],
        },
      },
    ],
  },
});
