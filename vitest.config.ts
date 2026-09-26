import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/**/vitest.config.{ts,js}",
      "packages/**/vitest.config.{ts,js}",
    ],
  },
});
