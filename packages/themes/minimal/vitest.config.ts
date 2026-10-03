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
          include: ["**/*.test.ts"],
          name: "node",
        },
      },
      {
        test: {
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          name: "jsdom",
        },
      },
    ],
  },
});
