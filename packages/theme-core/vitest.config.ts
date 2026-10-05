import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "theme-core",
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
          include: ["**/*.test.tsx"],
        },
      },
    ],
  },
});
