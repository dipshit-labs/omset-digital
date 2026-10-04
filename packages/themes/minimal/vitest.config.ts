import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "theme-minimal",
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
    ],
  },
});
