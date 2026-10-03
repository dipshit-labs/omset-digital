import { defineProject } from "vitest/config";

export default defineProject({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    hookTimeout: 30_000,
    name: "payload-plugin-commerce",
    testTimeout: 30_000,
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
