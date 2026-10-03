import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    projects: [
      "apps/**/vitest.config.{ts,js}",
      "packages/**/vitest.config.{ts,js}",
    ],
  },
});
