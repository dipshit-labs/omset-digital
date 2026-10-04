import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
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
      include: [
        "packages/*/src/**/*.{ts,tsx}",
        "packages/themes/*/src/**/*.{ts,tsx}",
        "apps/*/src/**/*.{ts,tsx}",
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
      "packages/themes/*/vitest.config.{ts,js}",
    ],
  },
});
