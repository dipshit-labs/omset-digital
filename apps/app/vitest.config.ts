import path from "node:path";

import { loadEnvConfig } from "@next/env";
import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

const { combinedEnv } = loadEnvConfig(process.cwd());

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@payload-config": path.resolve(
        import.meta.dirname,
        "./src/payload/payload.config.ts"
      ),
    },
  },
  test: {
    env: combinedEnv,
    environment: "jsdom",
    name: "app",
  },
});
