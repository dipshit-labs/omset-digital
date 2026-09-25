import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineProject } from "vitest/config";

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
    environment: "jsdom",
    name: "app",
  },
});
