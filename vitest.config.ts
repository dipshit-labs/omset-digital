import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.test.{ts,tsx,js,jsx}",
        "**/*.spec.{ts,tsx,js,jsx}",
        "**/test/factories/**",
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
      "apps/**/vitest.config.{ts,js}",
      "packages/**/vitest.config.{ts,js}",
    ],
  },
});
