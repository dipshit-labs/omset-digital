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
          environment: "node",
          include: ["src/**/*.test.ts"],
          name: "unit",
          setupFiles: ["@repo/test-kit/msw/setup"],
        },
      },
    ],
  },
});
