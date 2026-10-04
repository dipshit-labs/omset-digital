import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      include: ["packages/*/src/**/*.{ts,tsx}", "apps/*/src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.integration.test.{ts,tsx}",
        "**/test/**",
        "**/generated.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        "packages/commerce-adapters/**": {
          branches: 80,
          statements: 80,
        },
        "packages/payload-plugin-commerce/**": {
          branches: 80,
          statements: 80,
        },
      },
    },
    projects: [
      "apps/*/vitest.config.{ts,js}",
      "packages/*/vitest.config.{ts,js}",
    ],
  },
});
